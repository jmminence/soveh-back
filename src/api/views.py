import io
import json
import csv

import pdfkit
from dateutil.parser import ParserError, parse
from django.contrib.admin.models import LogEntry
from django.contrib.contenttypes.models import ContentType
from django.core.mail import EmailMultiAlternatives
from django.db import IntegrityError
from django.db.models import Q
from django.db.models import IntegerField
from django.db.models.functions import Cast
from django.views.decorators.csrf import csrf_exempt
from rest_framework import generics, viewsets
from rest_framework.parsers import MultiPartParser
from rest_framework.decorators import action, api_view
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.paginations import FullListResults, StandardResultsSetPagination
from api.serializers import *
from backend.models import *


class UserDetail(APIView):
    """
    API endpoint that allow a single User to be detailed, including groups and permissions.

    * Only returns the currently logged in user.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        serialized = UserSerializer(user)
        return Response(serialized)


class EntryFormViewSet(viewsets.ModelViewSet):
    """
    API endpoint viewset for viewing and editing :model:`backend.EntryForm` instances.
    """

    queryset = EntryForm.objects.all().order_by("-no_caso")
    serializer_class = EntryformSerializer
    permission_classess = [IsAuthenticated]

    def get_queryset(self):
        queryset = EntryForm.objects.all()

        if "filter" in self.request.GET and self.request.GET["filter"]:
            search = self.request.GET["filter"]
            queryset = queryset.filter(
                Q(no_caso__icontains=search)
                | Q(customer__name__icontains=search)
                | Q(center__icontains=search)
                | Q(no_request__icontains=search)
                | Q(created_at__icontains=search)
            )

        is_sorting = "sorting" in self.request.GET and self.request.GET["sorting"]
        has_direction = (
            "sort_direction" in self.request.GET and self.request.GET["sort_direction"]
        )

        if is_sorting:
            sorting = self.request.GET["sorting"]

            # Convierte el campo 'no_caso' a un valor numérico antes de ordenar
            if sorting == "no_caso":
                queryset = queryset.annotate(numero_numerico=Cast('no_caso', IntegerField()))
            # Si sort_direction es "asc", entonces ordena de forma ascendente
            if has_direction and self.request.GET["sort_direction"] == "asc":
                queryset = queryset.order_by('id')  # Orden ascendente
            else:
                # De lo contrario, ordena de forma descendente (predeterminado)
                queryset = queryset.order_by('-id')  # Orden descendente

        return queryset

    def create(self, request, *args, **kwargs):
        form_data = request.data
        last_form=Form.objects.filter(flow_id=1, parent_id=None).last()
        last_entry=EntryForm.objects.get(id=last_form.object_id)
        no_caso=int(last_entry.no_caso[1:])+1
        form_data["no_caso"] = f"V{no_caso}"
        form_data["entryform_type_id"] = 1
        if "customer" in form_data and form_data["customer"]:
            customer_data = form_data.pop("customer")
            customer = Customer.objects.get(**customer_data)
            form_data["customer_id"] = customer.id
        entryform = EntryForm.objects.create(created_by=request.user, **form_data)
        form = Form.objects.create(
            content_object=entryform, flow_id=1, state_id=4, reception_finished=1, reception_finished_at=timezone.now()
        )
        serializer = self.get_serializer(entryform)
        return Response(serializer.data, status=201)


    @action(detail=True, methods=["get"])
    def get_tree_sample(self, request, pk=None):
        """
        Generates an array of :model:`backend.Identification`, which include an array
        of it's children :model:`backend.Unit`, and so on for :model:`backend.Organ` and
        :model:`backend.AnalysisForm`.
        """
        entryform = self.get_object()
        self.convert_preunit_to_unit(entryform)
        identifications = entryform.identification_set.all()
        tree_sample = []

        for identification in identifications:
            identification_prototype = {
                "id": identification.id,
                "cage": identification.cage,
                "clientCaseNumber": identification.client_case_number,
                "group": identification.group,
                "extra_features_detail": identification.extra_features_detail,
                "correlative": identification.correlative,
                "weight": identification.weight,
                "observation": identification.observation,
                "children": [],
            }

            units = identification.unit_set.all()

            for unit in units:
                unit_prototype = {
                    "id": unit.id,
                    "correlative": unit.correlative,
                    "children": [],
                }

                unit_organs = unit.organunit_set.all()

                for unit_organ in unit_organs:
                    organ_prototype = {
                        "id": unit_organ.organ.id,
                        "unit_organ_id": unit_organ.id,
                        "unit_id": unit.id,
                        "name": unit_organ.organ.name,
                        "abbreviation": unit_organ.organ.abbreviation,
                        "children": [],
                    }

                    analysis = unit_organ.sampleexams_set.all()

                    unit_prototype["children"].append(organ_prototype)

                identification_prototype["children"].append(unit_prototype)

            tree_sample.append(identification_prototype)

        return Response(tree_sample)

    @action(detail=True, methods=["post"])
    def save_tree_sample(self, request, pk=None):
        """
        Stores :model:`backend.Identification`, :model:`backend.Unit`, and :model:`backend.OrganUnit`
        from a tree structure, where each depth of the tree holds a key `children`, which stores
        the next level's models.
        """
        entryform = self.get_object()
        tree_sample = request.data

        delete_keys = ["expanded", "selected", "deleted", "hidden"]

        for identification_prototype in tree_sample:
            units = identification_prototype.pop("children")
            identification_pk = (
                None
                if not "id" in identification_prototype
                else identification_prototype["id"]
            )

            should_delete = (
                "deleted" in identification_prototype
                and identification_prototype["deleted"]
            )

            if identification_pk and should_delete:
                try:
                    identification = Identification.objects.get(pk=identification_pk)
                except Identification.DoesNotExist:
                    continue
                else:
                    identification.delete()
                    continue

            if not identification_pk and should_delete:
                continue

            for key in delete_keys:
                identification_prototype.pop(key, None)

            identification_prototype["entryform"] = entryform
            identification_prototype["quantity"] = len(units)
            identification, created = Identification.objects.update_or_create(
                pk=identification_pk, defaults=identification_prototype
            )

            for unit_prototype in units:
                samples = unit_prototype.pop("children")
                unit_pk = None if not "id" in unit_prototype else unit_prototype["id"]

                should_delete = (
                    "deleted" in unit_prototype and unit_prototype["deleted"]
                )

                if unit_pk and should_delete:
                    try:
                        unit = Unit.objects.get(pk=unit_pk)
                    except Unit.DoesNotExist:
                        continue
                    else:
                        unit.delete()
                        continue

                if not unit_pk and should_delete:
                    continue

                for key in delete_keys:
                    unit_prototype.pop(key, None)

                unit_prototype["identification_id"] = identification.id

                unit, created_unit = Unit.objects.update_or_create(
                    pk=unit_pk, defaults=unit_prototype
                )

                for sample_prototype in samples:
                    unit_organ_pk = (
                        None
                        if not "unit_organ_id" in sample_prototype
                        else sample_prototype["unit_organ_id"]
                    )

                    should_delete = (
                        "deleted" in sample_prototype and sample_prototype["deleted"]
                    )

                    if unit_organ_pk and should_delete:
                        try:
                            unit_organ = OrganUnit.objects.get(pk=unit_organ_pk)
                        except OrganUnit.DoesNotExist:
                            continue
                        else:
                            unit_organ.delete()
                            continue

                    if not unit_organ_pk and should_delete:
                        continue

                    for key in delete_keys:
                        sample_prototype.pop(key, None)

                    unit_organ, created_uo = OrganUnit.objects.update_or_create(
                        pk=unit_organ_pk,
                        defaults={"organ_id": sample_prototype["id"], "unit": unit},
                    )


        return self.get_tree_sample(request)

    @action(detail=True, methods=["get"])
    def get_tree_analysis(self, request, pk=None):
        """
        Returns an array containing all :model:`backend.AnalysisForm` of the given :model:`backend.EntryForm`.
        """
        entryform = self.get_object()

        self.transform_sampleexams_to_new_format(entryform)
        analysis_set = entryform.analysisform_set.all()

        tree_analysis = []

        for analysis in analysis_set:

            if analysis.samples.count() <= 0:
                self.transform_sampleexams_to_new_format(entryform)

            row = {
                "exam": ExamSerializer(analysis.exam).data,
                "stain": StainSerializer(analysis.stain).data,
                "samples": [],
                "id": analysis.id,
            }
            samples = analysis.samples.all()
            for sample in samples:
                row["samples"].append(
                    {
                        "unit_organ_id": sample.id,
                        "unit_id": sample.unit_id,
                        "id": sample.organ_id,
                        "name": sample.organ.name,
                        "abbreviation": sample.organ.abbreviation,
                    }
                )

            tree_analysis.append(row)

        return Response(tree_analysis)

    @action(detail=True, methods=["post"])
    def save_tree_analysis(self, request, pk=None):
        """
        Stores a :model:`backend.Entryform`'s related :model:`backend.AnalysisForm`
        """
        entryform = self.get_object()
        tree_analysis = request.data

        delete_keys = ["expanded", "selected", "deleted", "hidden"]

        for analysis_prototype in tree_analysis:
            analysis_pk = None if not "id" in analysis_prototype else analysis_prototype["id"]
            should_delete = "deleted" in analysis_prototype and analysis_prototype["deleted"]

            if analysis_pk and should_delete:
                try:
                    analysis = AnalysisForm.objects.get(pk=analysis_pk)
                except AnalysisForm.DoesNotExist:
                    continue
                else:
                    analysis.delete()
                    continue

            if not analysis_pk and should_delete:
                continue

            attributes = {
                "entryform_id": entryform.id,
                "exam_id": analysis_prototype["exam"]["id"],
                "stain_id": analysis_prototype["stain"]["id"],
            }
            analysis, created = AnalysisForm.objects.update_or_create(pk=analysis_pk, defaults=attributes)

            unitOrgans = [sample["unit_organ_id"] for sample in analysis_prototype["samples"]]
            analysis.samples.set(unitOrgans)

            if created:
                exam = analysis_prototype["exam"]
                flow_pk = None
                state_pk = None

                if exam["service"] in [1, 3, 4]:
                    flow_pk = 2
                    state_pk = 7
                elif exam["service"] == 5:
                    continue
                else:
                    flow_pk = 3
                    state_pk = 12

                Form.objects.create(
                    content_object=analysis,
                    flow_id=flow_pk,
                    state_id=state_pk,
                    parent_id=entryform.forms.first().id,
                )

            self.transform_new_format_to_sampleexams(analysis)

        return self.get_tree_analysis(request)

    @action(detail=True, methods=["post"])
    def upload_case_file(self, request, pk=None):
        """
        Uploads and stores a file in the server, creating a new :model:`backend.CaseFile`
        in the process.
        """
        entryform = self.get_object()
        new_file = request.FILES["file"]
        try:
            case_file = CaseFile.objects.create(file=new_file, loaded_by=request.user)
            entryform.attached_files.add(case_file)
        except IntegrityError:
            return Response(status=500)
        else:
            return Response(CaseFileSerializer(case_file).data, status=201)

    @action(detail=True, methods=["post"])
    def email_notification(self, request, pk=None):
        """
        Sends an email to the resource's :model:`backend.Responsible`.
        """

        entryform = self.get_object()

        form_data = json.loads(request.body)
        template_pk = form_data["template_id"]
        recipients = form_data["recipients"]
        body = form_data["body"]

        try:
            email_template = EmailTemplate.objects.get(pk=template_pk)
        except EmailTemplate.DoesNotExist:
            return Response(data="EMAIL TEMPLATE NOT FOUND", status=404)

        text_center = entryform.center if entryform.center else ""
        subject = f"[VEHICE] {email_template.subject if email_template.subject else email_template.name}: {entryform.no_caso} / {text_center}"

        from_email = settings.EMAIL_HOST_USER
        email = EmailMultiAlternatives(subject, body, from_email, recipients)
        for cc in email_template.cc.all():
            email.bcc.append(cc.email)
        for attachment in email_template.attachments.all():
            email.attach_file(attachment.template_file.path)


        try:
            options = {
                "quiet": "",
                "page-size": "A4",
                "encoding": "UTF-8",
                "margin-top": "5mm",
                "margin-left": "5mm",
                "margin-right": "5mm",
                "margin-bottom": "10mm",
                "footer-center": "[page]",
            }
            url = reverse("template_resumen_report", kwargs={"id": entryform.id, "userId": request.user.id})
            pdf = pdfkit.from_url(settings.SITE_URL + url, False, options=options)
            binary_pdf = io.BytesIO(pdf)
            email.attach(f"{subject}.pdf", binary_pdf.read(), 'application/pdf')
        except:
            return Response(data='NO ATTACHMENT', status=500)

        try:
            email.send()
        except:
            return Response(data='SEND ERROR', status=500)

        return Response(status=200)



    @action(detail=True, methods=["get"])
    def changelog(self, request, pk=None):
        """
        Returns the :model:`backend.EntryForm`'s changelog.
        """
        entryform = self.get_object()
        analysis = AnalysisForm.objects.filter(entryform=entryform)
        identifications = Identification.objects.filter(entryform=entryform)

        content_type = ContentType.objects.get(app_label="backend", model="entryform")
        entryform_entries = LogEntry.objects.filter(content_type=content_type, object_id=entryform.id)

        content_type = ContentType.objects.get(app_label="backend", model="analysisform")
        analysis_entries = LogEntry.objects.filter(content_type=content_type, object_id__in=analysis.values_list("id", flat=True))

        content_type = ContentType.objects.get(app_label="backend", model="identification")
        identification_entries = LogEntry.objects.filter(content_type=content_type, object_id__in=identifications.values_list("id", flat=True))

        log_entries = entryform_entries | analysis_entries | identification_entries
        log_entries = log_entries.order_by("-action_time")

        results = self.paginate_queryset(log_entries)
        serialized = LogEntrySerializer(results, many=True)
        return self.get_paginated_response(serialized.data)


    def transform_sampleexams_to_new_format(self, entryform):
        """
        Generates the old :model:`backend.SampleExams` to the new one-to-many relationship
        in :model:`backend.AnalysisForm` with :model:`backend.OrganUnit`.
        """
        samples = Sample.objects.filter(entryform=entryform)
        sample_exams = SampleExams.objects.filter(sample__in=samples)

        for sample_exam in sample_exams:
            try:
                analysis = AnalysisForm.objects.get(
                    exam=sample_exam.exam, stain=sample_exam.stain, entryform=entryform
                )
            except:
                continue
            else:
                if sample_exam.unit_organ_id:
                    unit_organ = OrganUnit.objects.get(id=sample_exam.unit_organ_id)
                    analysis.samples.add(unit_organ)

    def transform_new_format_to_sampleexams(self, analysis):
        """
        Converts the new :model:`backend.AnalysisForm` one-to-many relationship with :model:`backend.OrganUnit`
        to the old based around :model:`backend.SampleExams`.
        """
        entryform = analysis.entryform
        samples = analysis.samples.all()

        exams=[]
        exams = analysis.exam

        index = 1

        identifications = Identification.objects.filter(
            entryform=entryform
        ).order_by("id")

        for identification in identifications:
            units = Unit.objects.filter(identification=identification).order_by("correlative")
            organs_units = {}
            for unit in units:
                for organ_unit in OrganUnit.objects.filter(unit=unit).order_by("id"):
                    if organ_unit.organ.pk in organs_units:
                        organs_units[organ_unit.organ.pk].append(organ_unit)
                    else:
                        organs_units[organ_unit.organ.pk] = [organ_unit]


            larger_organs_set = []
            for key, value in organs_units.items():
                if len(value) > len(larger_organs_set):
                    larger_organs_set = value

            groups = []

            for organ in larger_organs_set:
                groups.append([organ])

            for unit in units:
                used_organ = False

                for ou_available in OrganUnit.objects.filter(unit=unit).order_by("id"):
                    ou_is_used = False
                    for group in groups:
                        organs_ids_in_group = list(map(lambda ou: ou.organ.pk, group))
                        if ou_available.organ.pk not in organs_ids_in_group:
                            group.append(ou_available)
                            ou_is_used = True
                            break

            for group in groups:

                index_sample = Sample.objects.filter(
                    entryform=entryform,
                    index=index,
                ).first()

                nexts_samples = Sample.objects.filter(
                    entryform=entryform,
                    index__gt=index,
                ).order_by("index")

                if index_sample and len(nexts_samples) > 0:

                    if index_sample.identification != identification:
                        new_sample = Sample.objects.create(
                            entryform=entryform, index=index, identification=identification
                        )
                        index_sample.index = int(index_sample.index) + 1
                        index_sample.save()

                        for ns in nexts_samples:
                            ns.index = int(ns.index) + 1
                            ns.save()
                    else:
                        diff = nexts_samples[0].index - index
                        if diff > 1:
                            for ns in nexts_samples:
                                ns.index = int(ns.index) - (diff - 1)
                                ns.save()

                elif not index_sample and len(nexts_samples) > 0:
                    diff = nexts_samples[0].index - index

                    if nexts_samples[0].identification != identification:
                        new_sample = Sample.objects.create(
                            entryform=entryform, index=index, identification=identification
                        )

                        if diff > 1:
                            for ns in nexts_samples:
                                ns.index = int(ns.index) - (diff - 1)
                                ns.save()
                    else:
                        for ns in nexts_samples:
                            ns.index = int(ns.index) - diff
                            ns.save()

                elif not index_sample and len(nexts_samples) == 0:
                    new_sample = Sample.objects.create(
                        entryform=entryform, index=index, identification=identification
                    )

                sample = Sample.objects.filter(
                    entryform=entryform, index=index, identification=identification
                ).first()

                # Cleaning sample's unit organs not setted
                to_remove = []
                if sample:
                    for ou in sample.unit_organs.all():
                        sample_list = list(map(lambda x: x.id, samples))
                        if ou.id not in sample_list:
                            to_remove.append(ou.id)

                    for ou in to_remove:
                        SampleExams.objects.filter(unit_organ = ou, exam=exams).delete()

                    # Adding new unit organs to sample
                    for ou in group:
                        sample_uo = sample.unit_organs.all().values_list("pk", flat=True)
                        if ou.pk not in sample_uo:
                            sample.unit_organs.add(ou)

                index += 1

        if analysis.samples.count() > 0:
            samples = analysis.samples.all()

            for sample in samples:
                sample_object = Sample.objects.filter(unit_organs__in=[sample]).first()
                try:
                    obj, created = SampleExams.objects.get_or_create(
                        exam=analysis.exam,
                        stain=analysis.stain,
                        unit_organ_id=sample.id,
                        organ=sample.organ,
                        sample=sample_object
                    )
                except SampleExams.MultipleObjectsReturned:
                    continue

    def convert_preunit_to_unit(self, entryform):
        """
        Generates :model:`backend.Unit` for the old :model:`backend.EntryForm` (id <= 2034).
        """
        identifications = entryform.identification_set.all()

        for identification in identifications:
            units = Unit.objects.filter(identification=identification)
            samples = Sample.objects.filter(identification=identification).order_by(
                "index"
            )

            if units.count() <= 0:
                index = 0

                for sample in samples:
                    index += 1
                    sample_exams = SampleExams.objects.filter(sample=sample)
                    unit = Unit.objects.create(
                        correlative=index, identification=identification
                    )

                    unit_organs_id = []
                    unit_organs = []
                    for sample_exam in sample_exams:
                        unit_organ = OrganUnit.objects.filter(
                            unit=unit, organ=sample_exam.organ
                        ).first()

                        if not unit_organ:
                            unit_organ = OrganUnit.objects.create(
                                unit=unit, organ=sample_exam.organ
                            )
                        if unit_organ.id not in unit_organs_id:
                            unit_organs_id.append(unit_organ.id)
                            unit_organs.append(unit_organ)

                        sample_exam.unit_organ = unit_organ
                        sample_exam.save()

                    for unit_organ in unit_organs:
                        sample.unit_organs.add(unit_organ)
                    sample.save()


class DestroyCaseFile(generics.DestroyAPIView):
    """
    API endpoint that deletes a :model:`backend.CaseFile`
    while removing any attachment.
    """

    queryset = CaseFile.objects.all()
    serializers = CaseFileSerializer
    permission_classes = [IsAuthenticated]


    def delete(self, request, pk=None):
        case_file = self.get_object()
        deleted = case_file.delete()
        if deleted[0] >= 1:
            return Response()
        return Response(status=500)


class CustomerList(generics.ListCreateAPIView):
    """
    API endpoint that allows :model:`backend.Customer` to be viewed or created.
    """

    queryset = Customer.objects.all().order_by("id")
    serializer_class = CustomerSerializer
    pagination_class = FullListResults


class OrganList(generics.ListAPIView):
    """
    API endpoint that allows :model:`backend.Organ` to be viewed or created.
    """

    queryset = Organ.objects.all().order_by("id")
    serializer_class = OrganSerializer
    pagination_class = FullListResults


class ExamList(generics.ListAPIView):
    """
    API endpoint that allows :model:`backend.Exam` to be viewed or created.
    """

    queryset = Exam.objects.all().order_by("id")
    serializer_class = ExamSerializer
    pagination_class = FullListResults


class StainList(generics.ListAPIView):
    """
    API endpoint that allows :model:`backend.Stain` to be viewed or created.
    """

    queryset = Stain.objects.all().order_by("id")
    serializer_class = StainSerializer
    pagination_class = FullListResults


class CenterList(generics.ListCreateAPIView):
    """
    API endpoint that allows :model:`backend.Center` to be viewed or created.
    """

    queryset = Center.objects.all().order_by("name")
    serializer_class = CenterSerializer
    pagination_class = FullListResults


class FixativeList(generics.ListAPIView):
    """
    API endpoint that allows :model:`backend.Fixative` to be viewed or created.
    """

    queryset = Fixative.objects.all().order_by("id")
    serializer_class = FixativeSerializer
    pagination_class = FullListResults


class WaterSourceList(generics.ListAPIView):
    """
    API endpoint that allows :model:`backend.WaterSource` to be viewed or created.
    """

    queryset = WaterSource.objects.all().order_by("name")
    serializer_class = WaterSourceSerializer
    pagination_class = FullListResults


class SpecieList(generics.ListAPIView):
    """
    API endpoint that allows :model:`backend.Specie` to be viewed or created.
    """

    queryset = Specie.objects.all().order_by("name")
    serializer_class = SpecieSerializer
    pagination_class = FullListResults


class LarvalStageList(generics.ListAPIView):
    """
    API endpoint that allows :model:`backend.LarvalStage` to be viewed or created.
    """

    queryset = LarvalStage.objects.all().order_by("id")
    serializer_class = LarvalStageSerializer
    pagination_class = FullListResults


class ResponsibleViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows :model:`backend.Responsible` to be viewed.
    """

    queryset = Responsible.objects.filter(active=True).order_by("id")
    serializer_class = ResponsibleSerializer
    pagination_class = FullListResults

    def get_queryset(self):
        queryset = Responsible.objects.filter(active=True).order_by("id")

        if "filter" in self.request.GET and self.request.GET["filter"]:
            search = self.request.GET["filter"]
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(email__icontains=search)
                | Q(job__icontains=search)
            )

        is_sorting = "sorting" in self.request.GET and self.request.GET["sorting"]
        has_direction = (
            "sort_direction" in self.request.GET and self.request.GET["sort_direction"]
        )

        if is_sorting and has_direction:
            direction = self.request.GET["sort_direction"]
            sorting = self.request.GET["sorting"]
            sorting_string = f"-{sorting}" if direction == "desc" else sorting
            queryset = queryset.order_by(sorting_string)

        return queryset

    def destroy(self, request, *args, **kwargs):
        responsible = self.get_object()
        responsible.active = False
        responsible.save()
        return Response(True)

    @action(detail=False, methods=["get"])
    def search_slug(self, request):
        slug = request.GET.get("slug")

        if not slug:
            return Response(None)

        try:
            responsible = Responsible.objects.get(active=True, name=slug)
        except Responsible.DoesNotExist:
            return Response(status=404)
        except Responsible.MultipleObjectsReturned:
            return Response(status=500)
        else:
            serialized = ResponsibleSerializer(responsible)
            return Response(serialized.data)


class EmailTemplateList(generics.ListAPIView):
    """API endpoint that allows :model:`backend.EmailTemplate` to be viewed."""
    queryset = EmailTemplate.objects.all().order_by("id")
    serializer_class = EmailTemplateSerializer
    pagination_class = FullListResults


class CurrencyList(generics.ListAPIView):
    """API endpoint that allows :model:`backend.Currency` to be listed."""
    queryset = Currency.objects.all().order_by("name")
    serializer_class = CurrencySerializer


class AnalysisView(APIView, StandardResultsSetPagination):
    """
    View to list all AnalysisForm including information
    related to financial processing.

    * Requires authentication.
    * Only admin users are able to access this view.
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        queryset = AnalysisForm.objects.all().order_by("-created_at").prefetch_related("entryform", "exam", "patologo", "stain")

        if "case" in self.request.GET and self.request.GET["case"]:
            search_terms = self.request.GET["case"].split(";")
            query = Q()
            queries = [Q(entryform__no_caso__icontains=search_term) for search_term in search_terms]
            for item in queries:
                query |= item
            queryset = queryset.filter(query)

        if "client" in self.request.GET and self.request.GET["client"]:
            clients = json.loads(self.request.GET["client"])
            queryset = queryset.filter(
                Q(entryform__customer_id__in=clients)
            )

        if "service" in self.request.GET and self.request.GET["service"]:
            services = json.loads(self.request.GET["service"])
            queryset = queryset.filter(
                Q(exam_id__in=services)
            )

        if "receptioned_from" in self.request.GET and self.request.GET["receptioned_from"]:
            try:
                date = parse(self.request.GET["receptioned_from"])
            except ParserError:
                pass
            else:
                queryset = queryset.filter(
                    Q(entryform__created_at__gte=date)
                )

        if "receptioned_to" in self.request.GET and self.request.GET["receptioned_to"]:
            try:
                date = parse(self.request.GET["receptioned_to"])
            except ParserError:
                pass
            else:
                queryset = queryset.filter(
                    Q(entryform__created_at__lte=date)
                )

        if "invoice_status" in self.request.GET and self.request.GET["invoice_status"]:
            invoice_status = json.loads(self.request.GET["invoice_status"])
            queryset = queryset.filter(
                Q(invoice_status__in=invoice_status)
            )

        if "process_status" in self.request.GET and self.request.GET["process_status"]:
            process_status = json.loads(self.request.GET["process_status"])
            queryset = queryset.filter(
                Q(process_status__in=process_status)
            )

        if "center" in self.request.GET and self.request.GET["center"]:
            search_terms = self.request.GET["center"].split(";")
            query = Q()
            queries = [Q(entryform__center__icontains=search_term) for search_term in search_terms]
            for item in queries:
                query |= item
            queryset = queryset.filter(query)

        if "preinvoice_number" in self.request.GET and self.request.GET["preinvoice_number"]:
            search_terms = self.request.GET["preinvoice_number"].split(";")
            query = Q()
            queries = [Q(number__icontains=search_term) for search_term in search_terms]
            for item in queries:
                query |= item
            preinvoices = Preinvoice.objects.filter(query)
            analysis_preinvoices = AnalysisPreinvoice.object.filter(preinvoice__in=preinvoices).values_list("analysis_id", flat=True)
            queryset = queryset.filter(pk__in=analysis_preinvoices)


        if "invoice_number" in self.request.GET and self.request.GET["invoice_number"]:
            search_terms = self.request.GET["invoice_number"].split(";")
            query = Q()
            queries = [Q(number__icontains=search_term) for search_term in search_terms]
            for item in queries:
                query |= item
            invoices = Invoice.objects.filter(query)
            preinvoice = Preinvoice.objects.filter(invoice__in=invoices)
            analysis_preinvoices = AnalysisPreinvoice.object.filter(preinvoice__in=preinvoices).values_list("analysis_id", flat=True)
            queryset = queryset.filter(pk__in=analysis_preinvoices)

        if self.request.GET["sorting"] == "analysis_preinvoice":
            queryset = queryset.exclude(process_status="Anulado", exam__chargeable=False)

        if "only_chargeable" in self.request.GET and self.request.GET["only_chargeable"]:
            queryset = queryset.filter(
                Q(exam__chargeable=True)
            )

        is_sorting = "sorting" in self.request.GET and self.request.GET["sorting"]
        has_direction = (
            "sort_direction" in self.request.GET and self.request.GET["sort_direction"]
        )
        if is_sorting and has_direction:
            direction = self.request.GET["sort_direction"]
            sorting = self.request.GET["sorting"]

            sorting_string = "-{}" if direction == "desc" else "{}"

            if sorting == "no_caso":
                sorting_string = sorting_string.format("entryform__id")
            elif sorting == "customer":
                sorting_string = sorting_string.format("entryform__customer__name")
            elif sorting == "service":
                sorting_string = sorting_string.format("exam__name")
            elif sorting == "created_at":
                sorting_string = sorting_string.format("created_at")
                print(sorting)
            elif sorting == "unit_value":
                sorting_string = sorting_string.format("unit_value")
            elif sorting == "exchange_rate":
                sorting_string = sorting_string.format("exchange_rate")
            elif sorting == "center":
                sorting_string = sorting_string.format("entryform__center")
            elif sorting == "report_code":
                sorting_string = sorting_string.format("report_code")
            elif sorting == "interlab":
                sorting_string = sorting_string.format("entryform__no_request")
            elif sorting == "responsible":
                sorting_string = sorting_string.format("entryform__responsible")
            elif sorting == "transfer_order":
                sorting_string = sorting_string.format("entryform__transfer_order")
            else:
                sorting_string = sorting_string.format("entryform__id")

            queryset=queryset.order_by(sorting_string)

                # Convierte el campo 'no_caso' a un valor numérico antes de ordenar
            if sorting == "no_caso":
                queryset = queryset.annotate(numero_numerico=Cast('entryform_id', IntegerField())) 
                # De lo contrario, ordena de forma descendente (predeterminado)
            queryset = queryset.order_by(sorting_string)
        return queryset

    def get(self, request, format=None):
        analysis = self.get_queryset()
        results = self.paginate_queryset(analysis, request, view=self)
        serialized = AnalysisFormPreinvoiceSerializer(results, many=True)
        return self.get_paginated_response(serialized.data)


@api_view(["PUT"])
def analysis_financial_indicators(request):
    """Allows to update exchange_rate, currency, unit_value of a :model:`backend.AnalysisForm`"""
    if request.method == 'PUT':
        indicators = request.data["indicators"]
        pks = request.data["pks"]
        analysis = AnalysisForm.objects.filter(pk__in=pks)
        if analysis.count() > 0:
            if "overwrite" in indicators and indicators["overwrite"]:
                analysis.update(
                    exchange_rate=indicators["exchange_rate"],
                    currency=indicators["currency"],
                    unit_value=indicators["unit_value"]
                )
            else:
                indicators.pop("overwrite", None)
                if not indicators["exchange_rate"]:
                    indicators.pop("exchange_rate", None)
                if not indicators["currency"]:
                    indicators.pop("currency", None)
                if not indicators["unit_value"]:
                    indicators.pop("unit_value", None)

                analysis.update(**indicators)


            return Response(status=201)


class AnalysisPreinvoiceList(generics.ListCreateAPIView):
    """API endpoint that allows :model:`backend.AnalysisPreinvoice` to be listed."""
    queryset = AnalysisPreinvoice.objects.all().order_by("id")
    serializer_class = AnalysisPreinvoiceSerializer
    permission_classess = [IsAuthenticated, IsAdminUser]


    def create(self, request, *args, **kwargs):
        analysis = request.data["analysis"]
        preinvoices = request.data["preinvoices"]

        if len(analysis) > 0 and len(preinvoices) > 0:
            for analysis_id in analysis:
                try:
                    analysis_object = AnalysisForm.objects.get(pk=analysis_id)
                except AnalysisForm.DoesNotExist:
                    continue
                for preinvoice_id in preinvoices:
                    try:
                        preinvoice_object = Preinvoice.objects.get(pk=preinvoice_id)
                    except Preinvoice.DoesNotExist:
                        continue
                    else:
                        AnalysisPreinvoice.objects.create(
                            analysis_id=analysis_id,
                            preinvoice_id=preinvoice_id,
                            samples_studied=analysis_object.get_samples_amount()
                        )

        analysis_preinvoice = AnalysisPreinvoice.objects.filter(analysis_id__in=analysis)
        serialized = self.get_serializer(analysis_preinvoice, many=True)
        return Response(serialized.data, 200)


class AnalysisPreinvoiceUpdate(generics.UpdateAPIView):
    queryset = AnalysisPreinvoice.objects.all().order_by("id")
    serializer_class = AnalysisPreinvoiceSerializer
    permission_classess = [IsAuthenticated, IsAdminUser]


class PreinvoiceViewSet(viewsets.ModelViewSet):
    """
    API endpoint viewset for viewing and editing :model:`backend.Preinvoice` instances.
    """

    queryset = Preinvoice.objects.all().order_by("-number")
    serializer_class = PreinvoiceSerializer
    permission_classess = [IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        queryset = Preinvoice.objects.all().order_by("-number")

        if "filter" in self.request.GET and self.request.GET["filter"]:
            search = self.request.GET["filter"]
            queryset = queryset.filter(
                Q(number__icontains=search)
                | Q(customer__name__icontains=search)
                | Q(amount__icontains=search)
            )

        if "number" in self.request.GET and self.request.GET["number"]:
            search_terms = self.request.GET["number"].split(";")
            query = Q()
            queries = [Q(number__icontains=search_term) for search_term in search_terms]
            for item in queries:
                query |= item
            queryset = queryset.filter(query)

        is_sorting = "sorting" in self.request.GET and self.request.GET["sorting"]
        has_direction = (
            "sort_direction" in self.request.GET and self.request.GET["sort_direction"]
        )

        if is_sorting and has_direction:
            direction = self.request.GET["sort_direction"]
            sorting = self.request.GET["sorting"]
            sorting_string = f"-{sorting}" if direction == "desc" else sorting
            queryset = queryset.order_by(sorting_string)

        return queryset


    def create(self, request, *args, **kwargs):
        """
        Receives POST data `preoinvice` and `analysis`, and
        stores in the database a new Preinvoice, attaching to
        said instance the given Analysis.
        """
        preinvoice = request.data["preinvoice"]
        analysis_set = request.data["analysis"]

        preinvoice = Preinvoice(number=preinvoice["number"], customer_id=preinvoice["customer_id"], amount=preinvoice["amount"], date=preinvoice["date"], pay_person=preinvoice["pay_person"])
        preinvoice.save()

        for analysis in analysis_set:
            analysis_pk = analysis["analysis"]["id"]
            samples_studied = analysis["samples_studied"]
            AnalysisPreinvoice.objects.create(
                analysis_id=analysis_pk,
                preinvoice=preinvoice,
                samples_studied=samples_studied
            )

        headers = self.get_success_headers(preinvoice)
        serializer = PreinvoiceSerializer(instance=preinvoice)

        return Response(serializer.data, status=201, headers=headers)

    def update(self, request, *args, **kwargs):
        """
        Receives POST data `Preinvoice` and `analysisPreinvoices`
        """

        preinvoice = self.get_object()
        preinvoice_id=Preinvoice.objects.get(number=preinvoice).id
        updated_attributes = request.data["preinvoice"]
        analysis_preinvoices = request.data["analysisPreinvoices"]
        exclude_pks = []

        preinvoice.number = updated_attributes["number"]
        preinvoice.customer_id = updated_attributes["customer_id"]
        preinvoice.date = updated_attributes["date"]
        preinvoice.amount = updated_attributes["amount"]
        preinvoice.pay_person = updated_attributes["pay_person"]
        preinvoice.save(force_update=True)
        serializer = self.get_serializer(preinvoice)

        for analysis_preinvoice in analysis_preinvoices:
            if AnalysisPreinvoice.objects.filter(analysis=analysis_preinvoice["analysis"]["id"]):
                obj = AnalysisPreinvoice.objects.get(analysis=analysis_preinvoice["analysis"]["id"])
                obj.samples_studied = analysis_preinvoice["samples_studied"]
                obj.save()
            else:
                obj = AnalysisPreinvoice.objects.create(
                    analysis_id=analysis_preinvoice["analysis"]["id"],
                    preinvoice_id=preinvoice_id,
                    samples_studied=analysis_preinvoice["samples_studied"]
                    )

            exclude_pks.append(obj.id)

        AnalysisPreinvoice.objects.filter(preinvoice=preinvoice).exclude(pk__in=exclude_pks).delete()

        return Response(serializer.data, 201)

    @action(detail=False, methods=["get"])
    def search(self, request):
        """
        Returns a list of Preinvoices where its number contains
        the given search string.
        """

        search_string = request.GET.get("search")
        preinvoices = Preinvoice.objects.filter(number__icontains=search_string)
        serializer = self.get_serializer(preinvoices, many=True)

        return Response(serializer.data, status=200)

    @action(detail=True, methods=["get"])
    def get_analysis_preinvoice(self, request, pk=None):
        """
        Returns a list of all Analysis Preinvoices for a given Preinvoice.
        """

        preinvoice = self.get_object()
        analysis_preinvoice = AnalysisPreinvoice.objects.filter(preinvoice=preinvoice)

        serializer = AnalysisPreinvoiceSerializer(analysis_preinvoice, many=True)
        return Response(serializer.data, status=200)

    @action(detail=False, methods=["get"])
    def get_preinvoices_without_invoice(self, request, pk=None):
        """
        Returns a list of all Preinvoices without an assigned Invoice.
        """
        preinvoices = Preinvoice.objects.filter(invoice_id__isnull=True)
        serializer = self.get_serializer(preinvoices, many=True)

        return Response(serializer.data, status=200)

    @action(detail=True, methods=["put"])
    def add_analysis(self, request, pk=None):
        """
        Adds Analysis to the given Preinvoice, taken for samples amount all
        the samples in the Analysis.
        """
        preinvoice = self.get_object()
        analysis_set = AnalysisForm.objects.filter(pk__in=request.data)

        for analysis in analysis_set:
            AnalysisPreinvoice.objects.create(preinvoice=preinvoice, analysis=analysis, samples_studied=analysis.get_samples_amount())

        return Response(status=200)

    @action(detail=True, methods=["post"])
    def upload_preinvoice_file(self, request, pk=None):
        """
        Uploads and stores a file in the server, creating a new :model:`backend.CaseFile`
        in the process.
        """
        preinvoice = self.get_object()
        new_file = request.FILES["file"]
        try:
            preinvoice_file = PreinvoiceFile.objects.create(file=new_file, loaded_by=request.user)
            preinvoice.attached_files.add(preinvoice_file)
        except IntegrityError:
            return Response(status=500)
        else:
            return Response(PreinvoiceFileSerializer(preinvoice_file).data, status=201)

class PreinvoiceImportView(APIView):
    parser_classes = [MultiPartParser]

    def put(self, request, format=None):
        """
        Imports new Preinvoices from a csv file.
        """

        csv_file = request.FILES['file'].read().decode('latin-1')
        csv_data = csv.DictReader(io.StringIO(csv_file), delimiter=';')
        errors = False
        monto=0
        folio=""
        for row in csv_data:
            try:
                customer = Customer.objects.get(pk=row['cliente'])
            except Customer.DoesNotExist:
                errors = True
                continue
            try:
                date = parse(row['fecha'])
            except ParserError:
                errors = True
                continue

            if(folio!=row["folio"]):
                if(monto!=0):
                    preinvoice.amount=monto
                    preinvoice.save()
                preinvoice = Preinvoice.objects.create(number=row["folio"], customer=customer, date=date)
                monto=int(row["monto"])
                folio=row["folio"]
                analysis = AnalysisForm.objects.get(id=row["servicio"])
                AnalysisPreinvoice.objects.create(preinvoice=preinvoice, analysis=analysis, samples_studied=analysis.get_samples_amount())
            else:
                preinvoice = Preinvoice.objects.get(number=row["folio"])
                analysis = AnalysisForm.objects.get(id=row["servicio"])
                AnalysisPreinvoice.objects.create(preinvoice=preinvoice, analysis=analysis, samples_studied=analysis.get_samples_amount())
                monto=monto+int(row["monto"])

        return Response(status=200)

class DestroyPreinvoiceFile(generics.DestroyAPIView):
    """
    API endpoint that deletes a :model:`backend.CaseFile`
    while removing any attachment.
    """

    queryset = PreinvoiceFile.objects.all()
    serializers = PreinvoiceFileSerializer
    permission_classes = [IsAuthenticated]


    def delete(self, request, pk=None):
        preinvoice_file = self.get_object()
        deleted = preinvoice_file.delete()
        if deleted[0] >= 1:
            return Response()
        return Response(status=500)


class InvoiceViewSet(viewsets.ModelViewSet):
    """
    API endpoint viewset for viewing and editing :model:`backend.Invoice` instances.
    """

    queryset = Invoice.objects.all().order_by("-number")
    serializer_class = InvoiceSerializer
    permission_classess = [IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        queryset = Invoice.objects.all().order_by("-number")

        if "filter" in self.request.GET and self.request.GET["filter"]:
            search = self.request.GET["filter"]
            queryset = queryset.filter(
                Q(number__icontains=search)
                | Q(customer__name__icontains=search)
                | Q(amount__icontains=search)
            )

        is_sorting = "sorting" in self.request.GET and self.request.GET["sorting"]
        has_direction = (
            "sort_direction" in self.request.GET and self.request.GET["sort_direction"]
        )

        if is_sorting and has_direction:
            direction = self.request.GET["sort_direction"]
            sorting = self.request.GET["sorting"]
            sorting_string = f"-{sorting}" if direction == "desc" else sorting
            queryset = queryset.order_by(sorting_string)

        return queryset

    def create(self, request, *args, **kwargs):

        preinvoices_data = request.data["preinvoice"]
        preinvoices_pk = []
        for preinvoice in preinvoices_data:
            preinvoices_pk.append(preinvoice["id"])

        invoice = request.data["invoice"]
        customer_test = invoice["customer"]
        invoice = Invoice(number=invoice["number"], customer_id=invoice["customer"], amount=invoice["amount"], date=invoice["date"], observations = invoice["observations"])
        invoice.save()

        Preinvoice.objects.filter(pk__in=preinvoices_pk).update(invoice_id=invoice.id)

        headers = self.get_success_headers(preinvoice)
        serializer = InvoiceSerializer(instance=invoice)

        return Response(serializer.data, status=201, headers=headers)

    def update(self, request, *args, **kwargs):
        invoice = self.get_object()
        preinvoices_data = request.data['preinvoice']
        preinvoices_pk=[]

        for preinvoice in preinvoices_data:
            preinvoices_pk.append(preinvoice["id"])


        Preinvoice.objects.filter(invoice_id=invoice.id).exclude(pk__in=preinvoices_pk).update(invoice_id=None)
        Preinvoice.objects.filter(pk__in=preinvoices_pk).exclude(pk=invoice.id).update(invoice_id=invoice.id)

        edit_invoice = request.data["invoice"]
        invoice.number = edit_invoice["number"]
        invoice.customer_id = edit_invoice["customer_id"]
        invoice.date = edit_invoice["date"]
        invoice.observations = edit_invoice["observations"]
        invoice.amount = edit_invoice["amount"]
        invoice.save()

        serialized = self.get_serializer(invoice)
        return Response(serialized.data, status=200)

    @action(detail=True, methods=["get"])
    def list_preinvoices(self, request, pk=None):
        invoice = self.get_object()
        preinvoices = Preinvoice.objects.filter(invoice_id=invoice.id)
        serialized = PreinvoiceSerializer(preinvoices, many=True)

        return Response(serialized.data, status=200)

class InvoiceImportView(APIView):
    parser_classes = [MultiPartParser]

    def put(self, request, format=None):
        """
        Imports new Invoices from a csv file.
        """

        csv_file = request.FILES['file'].read().decode('utf-8')
        csv_data = csv.DictReader(io.StringIO(csv_file), delimiter=';')
        errors = False
        for row in csv_data:
            try:
                customer = Customer.objects.get(pk=row['cliente'])
            except Customer.DoesNotExist:
                errors = True
                continue
            try:
                date = parse(row['fecha'])
            except ParserError:
                errors = True
                continue

            invoice = Invoice(number=row['folio'], date=date, amount=row['monto'], created_at=date, customer=customer,)
            invoice.save()

            preinvoice_pk = row['prefacturas'].split(',')
            preinvoice_set = Preinvoice.objects.filter(pk__in=preinvoice_pk)
            for preinvoice in preinvoice_set:
                preinvoice.invoice = invoice
                preinvoice.save()

class ExchangeRateView(generics.ListCreateAPIView):
    """
    API endpoint that allows :model:`backend.ExchangeRate` to be viewed or created.
    """

    queryset = ExchangeRate.objects.all().order_by("-date")
    serializer_class = ExchangeRateSerializer
    permission_classess = [IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        date = self.request.GET.get("date", datetime.now())
        queryset = ExchangeRate.objects.filter(date=date).order_by("-date")
        return queryset


@csrf_exempt
def exchange_rate_import(request):
    year = request.POST.get("year")
    currency = request.POST.get("currency")
    return Response()
