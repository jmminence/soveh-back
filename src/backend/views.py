from email.headerregistry import Group
import json
import random
import string
from datetime import datetime, timedelta
from distutils.util import strtobool
import xlsxwriter
import io
from itertools import islice
import pdfkit
import os
import subprocess

from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.core import mail
from django.core.mail import BadHeaderError, EmailMultiAlternatives, send_mail
from django.db import connection
from django.db.models import F, Prefetch
from django.forms.models import model_to_dict
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.template.loader import get_template
from django.utils.decorators import method_decorator
from django.views.generic import View
from django.core.serializers import serialize
from django.http import QueryDict, HttpResponse
from django.core.exceptions import ObjectDoesNotExist
from django.views.decorators.cache import never_cache
from django.urls import reverse
from PyPDF2 import PdfReader, PdfWriter

from accounts.models import *
from app import views as app_view
from backend.models import *
from mb.models import Pool
from review.models import AnalysisGrouper, Grouper, FinalReport, Analysis
from workflows.models import *
from lab.models import Analysis, Cassette as LabCassette, CassetteOrgan as LabCassetteOrgan
from smtplib import SMTPException
from datetime import date

# from utils import functions as fn


class CUSTOMER(View):
    http_method_names = ["post"]

    def post(self, request):
        """
        Stores a new :model:`backend.Customer`
        """
        var_post = request.POST.copy()

        if var_post.get("laboratorio") == "on":
            laboratorio = "l"
        else:
            laboratorio = "s"

        customer = Customer.objects.create(
            name=var_post.get("nombre"),
            company=var_post.get("rut"),
            type_customer=laboratorio,
        )
        customer.save()

        return JsonResponse({"ok": True})


class EXAM(View):
    http_method_names = ["post"]

    def post(self, request):
        """
        Stores a new :model:`backend.Exam`
        """
        var_post = request.POST.copy()

        exam = Exam.objects.create(
            name=var_post.get("nombre"),
        )
        exam.save()

        return JsonResponse({"ok": True})


class ORGAN(View):
    http_method_names = ["get"]

    def get(self, request, organ_id=None):
        if organ_id:
            organ = Organ.objects.filter(pk=organ_id)
            organLocations = list(organ.organlocation_set.all().values())
            pathologys = list(organ.pathology_set.all().values())
            diagnostics = list(organ.diagnostic_set.all().values())
            diagnosticDistributions = list(
                organ.diagnosticdistribution_set.all().values()
            )
            diagnosticIntensity = list(
                organ.diagnosticintensity_set.all().values())

        else:
            organs = list(Organ.objects.all().values())

            data = {
                "organs": organs,
            }

        return JsonResponse(data)


class ENTRYFORM(View):
    http_method_names = ["get"]

    def get(self, request, id=None):
        if id:

            entryform = EntryForm.objects.values().get(pk=id)
            entryform_object = EntryForm.objects.get(pk=id)
            identifications = list(
                Identification.objects.filter(
                    entryform=entryform["id"]).values()
            )

            samples = Sample.objects.filter(entryform=entryform["id"]).order_by(
                "identification_id", "index"
            )

            samples_as_dict = []
            for s in samples:
                s_dict = model_to_dict(
                    s,
                    exclude=["organs", "unit_organs",
                             "sampleexams", "identification"],
                )
                organs = []

                for org in s.unit_organs.all():
                    unit = model_to_dict(
                        org.unit,
                        exclude=[
                            "organs",
                        ],
                    )
                    organ = model_to_dict(org.organ)
                    organs.append(
                        {"unit": unit, "organ": organ, "organ_unit_id": org.id}
                    )

                s_dict["organs_set"] = organs

                sampleexams = s.sampleexams_set.all()

                sampleExa = {}

                for sE in sampleexams:
                    analysis_form = entryform_object.analysisform_set.filter(
                        exam_id=sE.exam_id, stain_id=sE.stain_id
                    ).first()

                    if not analysis_form:
                        continue

                    a_form = analysis_form.forms.get()

                    is_cancelled = a_form.cancelled
                    is_closed = a_form.form_closed

                    exam_stain_tuple = str(sE.exam_id) + "-" + str(sE.stain_id)

                    uo_organ_id = None

                    if sE.unit_organ is not None:
                        uo_organ_id = sE.unit_organ.organ.id
                    else:
                        # Fix missing unit organ related to sample exams (old cases)
                        for uo in s.unit_organs.all():
                            if uo.organ_id == sE.organ_id:
                                sE.unit_organ = uo
                                sE.save()
                                uo_organ_id = uo.organ_id
                                break

                    sE_dict = {
                        "organ_name": sE.organ.name,
                        "uo_id": sE.unit_organ_id,
                        "uo_organ_id": uo_organ_id,
                        "organ_id": sE.organ.id,
                        "stain_id": sE.stain_id,
                        "stain_abbr": sE.stain.abbreviation,
                        "exam_id": sE.exam_id,
                        "exam_name": sE.exam.name,
                        "analysis_status": analysis_form.status,
                    }

                    if exam_stain_tuple in sampleExa.keys():
                        sampleExa[exam_stain_tuple].append(sE_dict)
                    else:
                        sampleExa[exam_stain_tuple] = [sE_dict]

                s_dict["sample_exams_set"] = sampleExa
                s_dict["identification"] = model_to_dict(
                    s.identification, exclude=[
                        "organs", "organs_before_validations"]
                )
                samples_as_dict.append(s_dict)

            # entryform["identifications"] = list(
            #     entryform_object.identification_set.all().values())
            entryform["identifications"] = []
            for ident in entryform_object.identification_set.all():
                ident_json = model_to_dict(
                    ident,
                    exclude=[
                        "organs",
                        "organs_before_validations",
                        "no_fish",
                        "no_container",
                        "temp_id",
                    ],
                )
                entryform["identifications"].append(ident_json)

            # entryform["analyses"] = list(
            #     entryform_object.analysisform_set.all().values('id', 'created_at', 'comments', 'entryform_id', 'exam_id', 'exam__name', 'patologo_id', 'patologo__first_name', 'patologo__last_name'))

            entryform["analyses"] = []
            for analysis in entryform_object.analysisform_set.filter(
                exam__isnull=False
            ):
                try:
                    analysis_form = analysis.forms.get()
                except Form.DoesNotExist:
                    continue

                samples = Sample.objects.filter(
                    entryform=analysis.entryform
                ).values_list("id", flat=True)
                sampleExams = SampleExams.objects.filter(
                    sample__in=samples, exam=analysis.exam, stain=analysis.stain
                )
                organs_count = samples_count = len(sampleExams)
                exam_pools = Pool.objects.filter(identification__entryform=entryform_object, exams=analysis.exam)
                organs_count += len(exam_pools)
                if analysis.exam.pricing_unit == 1:
                    samples_count = organs_count
                else:
                    sampleExams = SampleExams.objects.filter(
                        sample__in=samples, exam=analysis.exam, stain=analysis.stain
                    ).values_list("sample_id", flat=True)
                    samples_count = len(list(set(sampleExams)))

                aux = {
                    "id": analysis.id,
                    "created_at": analysis.created_at,
                    "comments": analysis.comments,
                    "stain": analysis.stain.abbreviation.upper()
                    if analysis.stain
                    else "N/A",
                    "entryform_id": analysis.entryform_id,
                    "exam_id": analysis.exam_id,
                    "exam__name": analysis.exam.name,
                    "exam__stain_id": analysis.stain.id
                    if analysis.exam.stain
                    else None,
                    "patologo_id": analysis.patologo_id,
                    "patologo__first_name": analysis.patologo.first_name
                    if analysis.patologo
                    else None,
                    "patologo__last_name": analysis.patologo.last_name
                    if analysis.patologo
                    else None,
                    "service_comments": [],
                    "service_deadline": [],
                    "deadline_comments": [],
                    "status": analysis.status,
                    "samples_count": samples_count,
                    "organs_count": organs_count,
                    "samples_charged": analysis.samples_charged,
                    "pools":[],
                }

                for cmm in analysis.service_comments.all():
                    aux["service_comments"].append(
                        {
                            "text": cmm.text,
                            "created_at": cmm.created_at.strftime("%d/%m/%Y %H:%M:%S"),
                            "done_by": cmm.done_by.get_full_name(),
                        }
                    )

                if AnalysisTimes.objects.filter(analysis=analysis, type_deadline=1).last() != None:
                    laboratoryDeadline = AnalysisTimes.objects.filter(
                        analysis=analysis, type_deadline=1).last().deadline.__format__('%d-%m-%Y')
                    aux["service_deadline"].append({
                        "deadline": laboratoryDeadline,
                        "type": "Laboratorio"
                    })

                if AnalysisTimes.objects.filter(analysis=analysis, type_deadline=2).exists():
                    pathologistDeadline = AnalysisTimes.objects.filter(
                        analysis=analysis, type_deadline=2).last().deadline.__format__('%d-%m-%Y')
                    aux["service_deadline"].append({
                        "deadline": pathologistDeadline,
                        "type": "Patologo"
                    })

                if AnalysisTimes.objects.filter(analysis=analysis, type_deadline=3).exists():
                    reviewDeadline = AnalysisTimes.objects.filter(
                        analysis=analysis, type_deadline=3).last().deadline.__format__('%d-%m-%Y')
                    aux["service_deadline"].append({
                        "deadline": reviewDeadline,
                        "type": "Revision"
                    })

                comments = AnalysisTimes.objects.filter(analysis=analysis)
                comments_aux = []
                for comment in comments:
                    if comment.service_comments != None and comment.service_comments not in comments_aux:
                        comments_aux.append(comment.service_comments)
                        aux["deadline_comments"].append({
                            "text": comment.service_comments.text,
                            "created_at": comment.service_comments.created_at.strftime("%d/%m/%Y %H:%M:%S"),
                            "done_by": comment.service_comments.done_by.get_full_name(),
                        })

                entryform["analyses"].append(aux)

            entryform["customer"] = (
                model_to_dict(entryform_object.customer)
                if entryform_object.customer
                else None
            )
            entryform["larvalstage"] = (
                model_to_dict(entryform_object.larvalstage)
                if entryform_object.larvalstage
                else None
            )
            entryform["fixative"] = (
                model_to_dict(entryform_object.fixative)
                if entryform_object.fixative
                else None
            )
            entryform["entryform_type"] = (
                model_to_dict(entryform_object.entryform_type)
                if entryform_object.entryform_type
                else None
            )
            entryform["watersource"] = (
                model_to_dict(entryform_object.watersource)
                if entryform_object.watersource
                else None
            )
            entryform["specie"] = (
                model_to_dict(entryform_object.specie)
                if entryform_object.specie
                else None
            )
            entryform["entry_format"] = (
                entryform_object.entry_format,
                entryform_object.get_entry_format_display(),
            )

            pools = Pool.objects.filter(identification__entryform=entryform_object)
            pools_list = []
            for pool in pools:
                exams=[]
                for exam in pool.exams.all():
                    exams.append({
                        "id":exam.id,
                        "name":exam.name
                    })

                pool_organs = []
                for organ in pool.organ_unit.all():
                    pool_organs.append({
                        "name":organ.organ.name,
                        "correlative":organ.unit.correlative,
                    })

                pools_list.append({
                    "id":pool.id,
                    "name":pool.name,
                    "identification":{
                        "cage":pool.identification.cage,
                        "group":pool.identification.group,
                        "extra_features_detail":pool.identification.extra_features_detail,
                    },
                    "exams":exams,
                    "organs":pool_organs,
                })

            entryform["pools"] = pools_list

            exams_set = list(Exam.objects.all().values())
            organs_set = list(Organ.objects.all().values())

            species_list = list(Specie.objects.all().values())
            larvalStages_list = list(LarvalStage.objects.all().values())
            fixtatives_list = list(Fixative.objects.all().values())
            waterSources_list = list(WaterSource.objects.all().values())
            customers_list = list(Customer.objects.all().values())
            patologos = list(
                User.objects.filter(
                    userprofile__profile_id__in=[4, 5]).values()
            )
            # entryform_types = list(EntryForm_Type.objects.all().values())
            if entryform_object.customer:
                researches = list(
                    Research.objects.filter(
                        status=True, clients__in=[entryform_object.customer]
                    ).values()
                )
            else:
                researches = []

            stains_list = list(Stain.objects.values())
            laboratories_list = list(Laboratory.objects.values())

            data = {
                "entryform": entryform,
                "identifications": identifications,
                "samples": samples_as_dict,
                "exams": exams_set,
                "organs": organs_set,
                "stains": stains_list,
                "species_list": species_list,
                "larvalStages_list": larvalStages_list,
                "fixtatives_list": fixtatives_list,
                "waterSources_list": waterSources_list,
                "customers_list": customers_list,
                "laboratories": laboratories_list,
                "patologos": patologos,
                # 'entryform_types_list': entryform_types,
                "research_types_list": researches,
            }
        else:
            species = list(Specie.objects.all().values())
            larvalStages = list(LarvalStage.objects.all().values())
            fixtatives = list(Fixative.objects.all().values())
            waterSources = list(WaterSource.objects.all().exclude(id__range=(
                1, 13)).values() | WaterSource.objects.filter(id=9).values())
            exams = list(Exam.objects.all().values())
            organs = list(Organ.objects.all().values())
            customers = list(Customer.objects.all().values())
            # entryform_types = list(EntryForm_Type.objects.all().values())
            researches = list(Research.objects.filter(status=True).values())
            stains_list = list(Stain.objects.values())
            laboratories_list = list(Laboratory.objects.values())

            data = {
                "species": species,
                "larvalStages": larvalStages,
                "fixtatives": fixtatives,
                "waterSources": waterSources,
                "exams": exams,
                "organs": organs,
                "stains": stains_list,
                "customers": customers,
                "laboratories": laboratories_list,
                # 'entryform_types': entryform_types,
                "research_types_list": researches,
            }
        return JsonResponse(data)


class CASSETTE(View):
    http_method_names = ["get"]

    def get(self, request, entry_form=None):
        analyses = list(
            AnalysisForm.objects.filter(entryform=entry_form).values_list(
                "id", flat=True
            )
        )
        exams = list(
            AnalysisForm.objects.filter(entryform=entry_form).values(
                name=F("exam__name"), stain=F("exam__stain")
            )
        )

        # no_slice = len(analyses)

        cassettes_qs = Cassette.objects.filter(entryform=entry_form).prefetch_related(
            Prefetch("organs")
        )
        cassettes = []

        for cassette in cassettes_qs:
            organs = [organ.name for organ in cassette.organs.all()]
            slices = []

            for slic in Slice.objects.filter(cassette=cassette):
                _slice_mtd = model_to_dict(slic)
                _slice_mtd["exam"] = slic.analysis.exam.name
                slices.append(_slice_mtd)

            samples_as_dict = []
            for s in cassette.samples.all():
                s_dict = model_to_dict(
                    s,
                    exclude=[
                        "organs",
                        "exams",
                        "identification",
                        "organs_before_validations",
                    ],
                )
                organs_set = []
                exams_set = []
                for sampleExam in s.sampleexams_set.all():
                    organs_set.append(model_to_dict(sampleExam.organ))
                    if sampleExam.exam.service_id in [1, 2, 3]:
                        exams_set.append(model_to_dict(sampleExam.exam))
                # cassettes_set = Cassette.objects.filter(sample=s).values()
                sampleexams = s.sampleexams_set.all()
                sampleExa = {}
                for sE in sampleexams:
                    try:
                        sampleExa[sE.exam_id]["organ_id"].append(
                            {"name": sE.organ.name, "id": sE.organ.id}
                        )
                    except:
                        sampleExa[sE.exam_id] = {
                            "exam_id": sE.exam_id,
                            "exam_name": sE.exam.name,
                            "exam_type": sE.exam.service_id,
                            "sample_id": sE.sample_id,
                            "organ_id": [{"name": sE.organ.name, "id": sE.organ.id}],
                        }
                    # organs.append(model_to_dict(sE.organ))
                # s_dict['organs_set'] = organs
                # s_dict['exams_set'] = list(exams)
                s_dict["sample_exams_set"] = sampleExa
                s_dict["organs_set"] = list(organs_set)
                # s_dict['exams_set'] = list(exams_set)
                # s_dict['cassettes_set'] = list(cassettes_set)
                s_dict["identification"] = model_to_dict(
                    s.identification, exclude=[
                        "organs", "organs_before_validations"]
                )
                samples_as_dict.append(s_dict)

            cassette_as_dict = model_to_dict(
                cassette, exclude=[
                    "organs", "organs_before_validations", "samples"]
            )
            cassette_as_dict["slices_set"] = slices
            cassette_as_dict["organs_set"] = organs
            cassette_as_dict["samples_set"] = samples_as_dict

            cassettes.append(cassette_as_dict)

        entryform = EntryForm.objects.values().get(pk=entry_form)
        entryform_object = EntryForm.objects.get(pk=entry_form)
        subflow = entryform_object.get_subflow
        entryform["subflow"] = subflow
        identifications = list(
            Identification.objects.filter(entryform=entryform["id"]).values()
        )

        samples = Sample.objects.filter(
            entryform=entryform["id"]).order_by("index")

        samples_as_dict = []
        for s in samples:
            s_dict = model_to_dict(
                s,
                exclude=[
                    "organs",
                    "exams",
                    "identification",
                    "organs_before_validations",
                ],
            )
            organs_set = []
            exams_set = []
            for sampleExam in s.sampleexams_set.all():
                organs_set.append(model_to_dict(sampleExam.organ))
                if sampleExam.exam.service_id in [1, 2, 3]:
                    exams_set.append(model_to_dict(sampleExam.exam))
            # cassettes_set = Cassette.objects.filter(sample=s).values()
            sampleexams = s.sampleexams_set.all()
            sampleExa = {}
            for sE in sampleexams:
                try:
                    sampleExa[sE.exam_id]["organ_id"].append(
                        {"name": sE.organ.name, "id": sE.organ.id}
                    )
                except:
                    sampleExa[sE.exam_id] = {
                        "exam_id": sE.exam_id,
                        "exam_name": sE.exam.name,
                        "exam_type": sE.exam.service_id,
                        "sample_id": sE.sample_id,
                        "organ_id": [{"name": sE.organ.name, "id": sE.organ.id}],
                    }
                # organs.append(model_to_dict(sE.organ))
            # s_dict['organs_set'] = organs
            # s_dict['exams_set'] = list(exams)
            s_dict["sample_exams_set"] = sampleExa
            s_dict["organs_set"] = list(organs_set)
            # s_dict['exams_set'] = list(exams_set)
            # s_dict['cassettes_set'] = list(cassettes_set)
            s_dict["identification"] = model_to_dict(
                s.identification, exclude=[
                    "organs", "organs_before_validations"]
            )
            samples_as_dict.append(s_dict)

        entryform["identifications"] = []
        for ident in entryform_object.identification_set.all():
            ident_json = model_to_dict(
                ident, exclude=["organs", "organs_before_validations"]
            )
            ident_json["organs_set"] = list(ident.organs.all().values())
            entryform["identifications"].append(ident_json)
        # entryform["answer_questions"] = list(
        #     entryform_object.answerreceptioncondition_set.all().values())
        entryform["analyses"] = list(
            entryform_object.analysisform_set.all().values(
                "id",
                "created_at",
                "comments",
                "entryform_id",
                "exam_id",
                "exam__name",
                "patologo_id",
                "patologo__first_name",
                "patologo__last_name",
            )
        )
        entryform["cassettes"] = list(
            entryform_object.cassette_set.all().values())
        entryform["customer"] = (
            model_to_dict(entryform_object.customer)
            if entryform_object.customer
            else None
        )
        entryform["larvalstage"] = (
            model_to_dict(entryform_object.larvalstage)
            if entryform_object.larvalstage
            else None
        )
        entryform["fixative"] = (
            model_to_dict(entryform_object.fixative)
            if entryform_object.fixative
            else None
        )
        entryform["watersource"] = (
            model_to_dict(entryform_object.watersource)
            if entryform_object.watersource
            else None
        )
        entryform["specie"] = (
            model_to_dict(
                entryform_object.specie) if entryform_object.specie else None
        )

        organs_set = list(Organ.objects.all().values())
        exams_set = list(Exam.objects.all().values())
        species_list = list(Specie.objects.all().values())
        larvalStages_list = list(LarvalStage.objects.all().values())
        fixtatives_list = list(Fixative.objects.all().values())
        waterSources_list = list(WaterSource.objects.all().values())
        customers_list = list(Customer.objects.all().values())
        patologos = list(
            User.objects.filter(userprofile__profile_id__in=[4, 5]).values()
        )
        # entryform_types = list(EntryForm_Type.objects.all().values())

        data = {
            "cassettes": cassettes,
            "exams_set": exams_set,
            "exams": exams,
            "analyses": analyses,
            "entryform": entryform,
            "samples": samples_as_dict,
            "organs": organs_set,
            "species_list": species_list,
            "larvalStages_list": larvalStages_list,
            "fixtatives_list": fixtatives_list,
            "waterSources_list": waterSources_list,
            "customers_list": customers_list,
            "patologos": patologos,
            # 'entryform_types_list': entryform_types
        }

        return JsonResponse(data)


class ANALYSIS(View):
    def get(self, request, entry_form=None):
        analyses_qs = AnalysisForm.objects.filter(
            entryform=entry_form, exam__isnull=False
        )
        analyses = []

        # samples = Sample.objects.filter(entryform=entry_form)
        analysis_with_zero_sample = []
        for analysis in analyses_qs:
            # stains = []
            # for s in samples:
            #     stains.extend(list(set(s.sampleexams_set.filter(exam=analysis.exam, stain__isnull=False).values_list('stain__abbreviation', flat=True))))

            if request.user.userprofile.profile_id == 5:
                if analysis.patologo_id != request.user.id:
                    continue
            exam = analysis.exam
            try:
                form = analysis.forms.get()
            except Form.DoesNotExist:
                continue

            form_id = form.id

            current_step_tag = form.state.step.tag
            current_step = form.state.step.order
            total_step = form.flow.step_set.count()

            if exam.service_id == 2:
                total_step = 2
                percentage_step = (int(current_step) / int(total_step)) * 100
            elif exam.service_id in [3, 4, 5]:
                total_step = 0
                percentage_step = 0
            else:
                percentage_step = (int(current_step) / int(total_step)) * 100

            samples = Sample.objects.filter(entryform=analysis.entryform).values_list(
                "id", flat=True
            )
            sampleExams = SampleExams.objects.filter(
                sample__in=samples, exam=exam, stain=analysis.stain
            )
            organs_count = samples_count = len(sampleExams)
            if analysis.exam.pricing_unit == 1:
                samples_count = organs_count
            else:
                sampleExams = SampleExams.objects.filter(
                    sample__in=samples, exam=analysis.exam, stain=analysis.stain
                ).values_list("sample_id", flat=True)
                samples_count = len(list(set(sampleExams)))

            analysis_pool = Pool.objects.filter(identification__entryform=analysis.entryform, exams=analysis.exam)
            samples_count += len(analysis_pool)

            slices_qs = analysis.slice_set.all()
            slices = []
            for slice_new in slices_qs:
                slices.append({"name": slice_new.slice_name})

            if not form.cancelled and not form.form_closed:
                analysis_with_zero_sample.append(
                    False if samples_count > 0 else True)

            analyses.append(
                {
                    "form_id": form_id,
                    "id": analysis.id,
                    "exam_name": exam.name,
                    "exam_stain": analysis.stain.abbreviation.upper()
                    if analysis.stain
                    else "N/A",
                    "exam_type": exam.service_id,
                    "exam_pathologists_assignment": exam.pathologists_assignment,
                    "slices": slices,
                    "current_step_tag": current_step_tag,
                    "current_step": current_step,
                    "total_step": total_step,
                    "percentage_step": percentage_step,
                    "form_closed": form.form_closed,
                    "form_reopened": form.form_reopened,
                    "service": exam.service_id,
                    "service_name": exam.service.name,
                    "cancelled": form.cancelled,
                    "patologo_name": analysis.patologo.get_full_name()
                    if analysis.patologo
                    else "",
                    "patologo_id": analysis.patologo.id if analysis.patologo else "",
                    "pre_report_started": analysis.pre_report_started,
                    "pre_report_ended": analysis.pre_report_ended,
                    "status": analysis.status,
                    "cancelled_by": analysis.manual_cancelled_by.get_full_name()
                    if analysis.manual_cancelled_by
                    else "",
                    "cancelled_at": analysis.manual_cancelled_date.strftime("%d/%m/%Y")
                    if analysis.manual_cancelled_date
                    else "",
                    "samples_count": samples_count,
                    "report_code": analysis.report_code,
                    "on_hold": analysis.on_hold,
                    "on_standby": analysis.on_standby,
                    "samples_charged": analysis.samples_charged
                }
            )

        entryform = EntryForm.objects.values().get(pk=entry_form)
        entryform_object = EntryForm.objects.get(pk=entry_form)
        subflow = entryform_object.get_subflow
        entryform["subflow"] = subflow

        entryform["identifications"] = []
        for ident in entryform_object.identification_set.all():
            ident_json = model_to_dict(
                ident, exclude=["organs", "organs_before_validations"]
            )
            ident_json["organs_set"] = list(ident.organs.all().values())
            entryform["identifications"].append(ident_json)

        entryform["analyses"] = list(
            entryform_object.analysisform_set.all().values(
                "id",
                "created_at",
                "comments",
                "entryform_id",
                "exam_id",
                "exam__name",
                "patologo_id",
                "patologo__first_name",
                "patologo__last_name",
            )
        )
        entryform["cassettes"] = list(
            entryform_object.cassette_set.all().values())
        entryform["customer"] = (
            model_to_dict(entryform_object.customer)
            if entryform_object.customer
            else None
        )
        entryform["larvalstage"] = (
            model_to_dict(entryform_object.larvalstage)
            if entryform_object.larvalstage
            else None
        )
        entryform["fixative"] = (
            model_to_dict(entryform_object.fixative)
            if entryform_object.fixative
            else None
        )
        entryform["watersource"] = (
            model_to_dict(entryform_object.watersource)
            if entryform_object.watersource
            else None
        )
        entryform["specie"] = (
            model_to_dict(
                entryform_object.specie) if entryform_object.specie else None
        )

        organs_set = list(Organ.objects.all().values())
        exams_set = list(Exam.objects.all().values())

        species_list = list(Specie.objects.all().values())
        larvalStages_list = list(LarvalStage.objects.all().values())
        fixtatives_list = list(Fixative.objects.all().values())
        waterSources_list = list(WaterSource.objects.all().values())
        customers_list = list(Customer.objects.all().values())
        patologos = list(
            User.objects.filter(userprofile__profile_id__in=[4, 5]).values()
        )
        # entryform_types = list(EntryForm_Type.objects.all().values())
        if entryform_object.customer:
            researches = list(
                Research.objects.filter(
                    status=True, clients__in=[entryform_object.customer]
                ).values()
            )
        else:
            researches = []

        data = {
            "analyses": analyses,
            "entryform": entryform,
            "exams_set": exams_set,
            "organs": organs_set,
            "species_list": species_list,
            "larvalStages_list": larvalStages_list,
            "fixtatives_list": fixtatives_list,
            "waterSources_list": waterSources_list,
            "customers_list": customers_list,
            "patologos": patologos,
            # 'entryform_types_list': entryform_types,
            "research_types_list": researches,
            "analysis_with_zero_sample": 1 if True in analysis_with_zero_sample else 0,
        }

        return JsonResponse(data)

    def put(self, request, pk):
        analysis = get_object_or_404(AnalysisForm, pk=pk)

        form = json.loads(request.body)
        analysis.samples_charged = form["value"]
        analysis.save()

        return JsonResponse({"status": "OK"})


class SLICE(View):
    def get(self, request, analysis_form=None):
        slices_qs = Slice.objects.filter(analysis=analysis_form)
        slices = []

        for slice_new in slices_qs:
            slice_as_dict = model_to_dict(slice_new, exclude=["cassette"])
            slice_as_dict["cassette"] = model_to_dict(
                slice_new.cassette,
                exclude=["organs", "organs_before_validations", "samples"],
            )
            slice_as_dict["organs"] = list(
                slice_new.cassette.organs.all().values())
            samples_as_dict = []
            for s in slice_new.cassette.samples.all():
                s_dict = model_to_dict(
                    s,
                    exclude=[
                        "organs",
                        "exams",
                        "identification",
                        "organs_before_validations",
                    ],
                )
                organs_set = []
                exams_set = []
                for sampleExam in s.sampleexams_set.all():
                    organs_set.append(model_to_dict(sampleExam.organ))
                    if sampleExam.exam.service_id in [1, 2, 3]:
                        exams_set.append(model_to_dict(sampleExam.exam))
                sampleexams = s.sampleexams_set.all()
                sampleExa = {}
                for sE in sampleexams:
                    try:
                        sampleExa[sE.exam_id]["organ_id"].append(
                            {"name": sE.organ.name, "id": sE.organ.id}
                        )
                    except:
                        sampleExa[sE.exam_id] = {
                            "exam_id": sE.exam_id,
                            "exam_name": sE.exam.name,
                            "exam_type": sE.exam.service_id,
                            "sample_id": sE.sample_id,
                            "organ_id": [{"name": sE.organ.name, "id": sE.organ.id}],
                        }
                s_dict["sample_exams_set"] = sampleExa
                s_dict["organs_set"] = list(organs_set)

                s_dict["identification"] = model_to_dict(
                    s.identification, exclude=[
                        "organs", "organs_before_validations"]
                )
                samples_as_dict.append(s_dict)

            slice_as_dict["samples"] = samples_as_dict
            slice_as_dict["paths_count"] = Report.objects.filter(
                slice_id=slice_new.pk
            ).count()
            slice_as_dict["analysis_exam"] = slice_new.analysis.exam.id
            slices.append(slice_as_dict)

        analysis_form = AnalysisForm.objects.get(pk=analysis_form)
        entryform = EntryForm.objects.values().get(pk=analysis_form.entryform.pk)
        entryform_object = EntryForm.objects.get(pk=analysis_form.entryform.pk)
        subflow = entryform_object.get_subflow
        entryform["subflow"] = subflow
        # identifications = list(
        #     Identification.objects.filter(
        #         entryform=entryform['id']).values())

        samples = Sample.objects.filter(
            entryform=entryform["id"]).order_by("index")

        samples_as_dict = []
        for s in samples:
            s_dict = model_to_dict(
                s,
                exclude=[
                    "organs",
                    "exams",
                    "identification",
                    "organs_before_validations",
                ],
            )
            organs_set = []
            exams_set = []
            for sampleExam in s.sampleexams_set.all():
                if sampleExam.exam == analysis_form.exam:
                    organs_set.append(model_to_dict(sampleExam.organ))
                    exams_set.append(model_to_dict(sampleExam.exam))

            if len(exams_set) > 0:
                # cassettes_set = Cassette.objects.filter(sample=s).values()
                s_dict["organs_set"] = list(organs_set)

                cassettes = Cassette.objects.filter(samples__in=[s]).values_list(
                    "id", flat=True
                )

                exam_slices = Slice.objects.filter(
                    cassette__in=cassettes, analysis=analysis_form
                )

                s_dict["exam_slices_set"] = []
                for l in exam_slices:
                    exam_slice = model_to_dict(l)
                    exam_slice["paths_count"] = Report.objects.filter(
                        slice_id=l.pk, sample_id=s.id
                    ).count()
                    exam_slice["analysis_exam"] = l.analysis.exam.id
                    s_dict["exam_slices_set"].append(exam_slice)
                # s_dict['cassettes_set'] = list(cassettes_set)
                s_dict["identification"] = model_to_dict(
                    s.identification, exclude=[
                        "organs", "organs_before_validations"]
                )
                samples_as_dict.append(s_dict)

        entryform["identifications"] = []
        for ident in entryform_object.identification_set.all():
            ident_json = model_to_dict(
                ident, exclude=["organs", "organs_before_validations"]
            )
            ident_json["organs_set"] = list(ident.organs.all().values())
            entryform["identifications"].append(ident_json)

        entryform["analyses"] = list(
            entryform_object.analysisform_set.all().values(
                "id",
                "created_at",
                "comments",
                "entryform_id",
                "exam_id",
                "exam__name",
                "patologo_id",
                "patologo__first_name",
                "patologo__last_name",
            )
        )
        entryform["cassettes"] = list(
            entryform_object.cassette_set.all().values())
        entryform["customer"] = (
            entryform_object.customer.name if entryform_object.customer else ""
        )
        entryform["larvalstage"] = (
            entryform_object.larvalstage.name if entryform_object.larvalstage else ""
        )
        entryform["fixative"] = (
            entryform_object.fixative.name if entryform_object.fixative else ""
        )
        entryform["watersource"] = (
            entryform_object.watersource.name if entryform_object.watersource else ""
        )
        entryform["specie"] = (
            entryform_object.specie.name if entryform_object.specie else ""
        )
        organs_set = list(Organ.objects.all().values())
        exams_set = list(Exam.objects.all().values())

        data = {
            "slices": slices,
            "entryform": entryform,
            "samples": samples_as_dict,
            "organs": organs_set,
            "exams_set": exams_set,
        }

        return JsonResponse(data)


class WORKFLOW(View):
    http_method_names = ["get", "post", "delete"]

    def sortReport(self, report):
        return report.organ_id

    @method_decorator(login_required)
    def get(self, request, form_id, step_tag=None):
        form = Form.objects.get(pk=form_id)
        if not step_tag:
            step_tag = form.state.step.tag
        object_form_id = form.content_object.id
        actor = Actor.objects.filter(
            profile_id=request.user.userprofile.profile_id
        ).first()
        if form.content_type.name == "entry form":
            state_id = step_tag.split("_")[1]
            permisos = actor.permission.filter(from_state_id=state_id)
            edit = 1 if permisos.filter(type_permission="w").first() else 0
            route = "app/workflow_main.html"

            close_allowed = 1
            closed = 0
            if form.form_closed or form.cancelled:
                close_allowed = 0
                closed = 1
            else:
                childrens = Form.objects.filter(parent_id=form)
                for ch in childrens:
                    if not ch.form_closed and not ch.cancelled:
                        close_allowed = 0
                        break

            up = UserProfile.objects.filter(user=request.user).first()
            edit_case = not form.form_closed and (
                up.profile.id in (1, 2, 3) or request.user.is_superuser
            )

            data = {
                "form": form,
                "form_id": form_id,
                "entryform_id": object_form_id,
                "set_step_tag": step_tag,
                "edit": edit,
                "closed": closed,
                "close_allowed": close_allowed,
                "edit_case": edit_case,
                "reception_finished": form.reception_finished,
            }

        elif form.content_type.name == "analysis form":
            reopen = False
            analisis = AnalysisForm.objects.get(id=int(object_form_id))
            if step_tag == "step_6":
                if analisis.exam.service_id == 1:
                    step_tag = "step_5"
                elif analisis.exam.service_id == 2:
                    step_tag = "step_2"

                reopen = True

            permisos = actor.permission.filter(
                from_state_id=int(step_tag.split("_")[1]) + 6
            )
            if permisos:
                edit = 1 if permisos.filter(type_permission="w").first() else 0
            else:
                return redirect(app_view.show_ingresos)

            if reopen:
                if not edit and not form.form_reopened:
                    return redirect(app_view.show_ingresos)
                form.form_closed = False
                form.form_reopened = True
                form.save()

            route = "app/workflow_analysis.html"

            reports = Report.objects.filter(analysis_id=int(object_form_id))
            from collections import defaultdict

            res = defaultdict(list)
            for report in reports:
                res[report.identification_id].append(report)

            data = {}
            for key, value in res.items():
                samples = Sample.objects.filter(
                    identification_id=key).order_by("index")
                matrix = []
                first_column = [["MUESTRA / HALLAZGO", 1], ""]
                first_column = first_column + list(
                    map(
                        lambda x: x.identification.cage
                        + "-"
                        + x.identification.group
                        + "-"
                        + str(x.index),
                        samples,
                    )
                )
                matrix.append(first_column + [""])

                res2 = defaultdict(list)
                value.sort(key=self.sortReport)
                for elem in value:
                    res2[
                        elem.pathology.name + " en " + elem.organ_location.name
                    ].append(elem)

                lastOrgan = ""
                for key2, value2 in res2.items():
                    if lastOrgan == value2[0].organ.name:
                        column = [["", 1], key2]
                        for col in matrix:
                            if col[0][0] == lastOrgan:
                                col[0][1] = col[0][1] + 1
                                break
                    else:
                        lastOrgan = value2[0].organ.name
                        column = [[value2[0].organ.name, 1], key2]
                    samples_by_index = {}

                    for sam in samples:
                        samples_by_index[sam.index] = []

                    for item in value2:
                        if item.identification_id == key:
                            samples_by_index[item.sample.index].append(
                                item.diagnostic_intensity.name
                            )

                    aux = []
                    count_hallazgos = 0
                    for k, v in samples_by_index.items():
                        if len(v) > 0:
                            aux.append(v[0])
                            count_hallazgos += 1
                        else:
                            aux.append("")

                    column = column + aux
                    percent = int(
                        round((count_hallazgos * 100) / len(samples), 0))
                    column.append(str(percent) + "%")
                    matrix.append(column)

                data[key] = list(zip(*matrix))

            report_finalExtra = ReportFinal.objects.filter(
                analysis_id=int(object_form_id)
            ).last()

            data = {
                "form": form,
                "analisis": analisis,
                "form_id": form_id,
                "analysis_id": object_form_id,
                "set_step_tag": step_tag,
                "exam_name": form.content_object.exam.name,
                "histologico": form.content_object.exam.service_id,
                "form_parent_id": form.parent.id,
                "entryform_id": analisis.entryform_id,
                "report": reports,
                "reports2": data,
                "reopen": reopen,
                "report_finalExtra": report_finalExtra,
                "edit": edit,
            }

        return render(request, route, data)

    def post(self, request):
        var_post = request.POST.copy()

        up = UserProfile.objects.filter(user=request.user).first()
        form = Form.objects.get(pk=var_post.get("form_id"))

        form_closed = False

        if var_post.get("form_closed"):
            form_closed = True

        id_next_step = var_post.get("id_next_step", None)
        previous_step = strtobool(var_post.get("previous_step", "false"))

        if not id_next_step:
            form_closed = True
        if not form_closed:
            next_step_permission = False
            process_response = False
            process_answer = True

            actor_user = None
            next_state = None

            if id_next_step:
                next_step = Step.objects.get(pk=id_next_step)

                for actor in next_step.actors.all():
                    if actor.profile == up.profile:
                        actor_user = actor
                        if previous_step:
                            next_state = Permission.objects.get(
                                to_state=form.state, type_permission="w"
                            ).from_state
                        else:
                            next_state = actor.permission.get(
                                from_state=form.state, type_permission="w"
                            ).to_state
                        break

            if not previous_step:
                process_answer = call_process_method(
                    form.content_type.model, request)
                if next_state:
                    next_step_permission = next_state.id != 1 and not len(
                        actor_user.permission.filter(
                            to_state=next_state, type_permission="w"
                        )
                    )
            else:
                if next_state:
                    next_step_permission = next_state.id != 1 and not len(
                        actor_user.permission.filter(
                            from_state=next_state, type_permission="w"
                        )
                    )
                    form.form_reopened = False

            if process_answer and next_state:
                current_state = form.state
                form.state = next_state
                form.save()
                if next_step_permission:
                    return redirect(app_view.show_ingresos)
                next_step_permission = not next_step_permission
                process_response = True
                # sendEmailNotification(form, current_state, next_state)
            else:
                print("FALLO EL PROCESAMIENTO")
                return redirect(app_view.show_ingresos)

            return JsonResponse(
                {
                    "process_response": process_response,
                    "next_step_permission": next_step_permission,
                }
            )
        else:
            process_answer = call_process_method(
                form.content_type.model, request)

            form.form_closed = False

            form.form_reopened = False
            form.save()

            return JsonResponse({"redirect_flow": True})

    def delete(self, request, form_id):
        form = Form.objects.get(pk=form_id)
        form.cancelled = True
        form.cancelled_at = datetime.now()
        form.save()
        forms = Form.objects.filter(
            parent_id=form_id, form_closed=False, cancelled=False
        )
        for f in forms:
            f.cancelled = True
            f.cancelled_at = datetime.now()
            f.save()
        # object_form_id = form.content_object.id
        return JsonResponse({"ok": True})


class REPORT(View):
    def get(self, request, slice_id=None, analysis_id=None):
        if slice_id:
            report_qs = Report.objects.filter(slice=slice_id)
            reports = []
            for report in report_qs:
                organ = report.organ.name if report.organ else ""
                organ_location = (
                    report.organ_location.name if report.organ_location else ""
                )
                pathology = report.pathology.name if report.pathology else ""
                diagnostic = report.diagnostic.name if report.diagnostic else ""
                diagnostic_distribution = (
                    report.diagnostic_distribution.name
                    if report.diagnostic_distribution
                    else ""
                )
                diagnostic_intensity = (
                    report.diagnostic_intensity.name
                    if report.diagnostic_intensity
                    else ""
                )
                image_list = []
                for img in report.images.all():
                    image_list.append(
                        {
                            "name": img.file.name.split("/")[-1],
                            "url": img.file.url,
                            "id": img.id,
                        }
                    )

                reports.append(
                    {
                        "report_id": report.id,
                        "organ": organ,
                        "organ_location": organ_location,
                        "pathology": pathology,
                        "diagnostic": diagnostic,
                        "diagnostic_distribution": diagnostic_distribution,
                        "diagnostic_intensity": diagnostic_intensity,
                        "images": image_list,
                    }
                )

            data = {"reports": reports}

        if analysis_id:
            report_qs = Report.objects.filter(analysis_id=analysis_id)
            reports = []
            for report in report_qs:
                image_list = []
                for img in report.images.all():
                    image_list.append(
                        {
                            "name": img.file.name.split("/")[-1],
                            "url": img.file.url,
                            "id": img.id,
                        }
                    )

                reports.append(
                    {
                        "report_id": report.id,
                        "organ": model_to_dict(report.organ),
                        "organ_location": model_to_dict(
                            report.organ_location, exclude=["organs"]
                        ),
                        "pathology": model_to_dict(
                            report.pathology, exclude=["organs"]
                        ),
                        "diagnostic": model_to_dict(
                            report.diagnostic, exclude=["organs"]
                        ),
                        "diagnostic_distribution": model_to_dict(
                            report.diagnostic_distribution, exclude=["organs"]
                        ),
                        "diagnostic_intensity": model_to_dict(
                            report.diagnostic_intensity, exclude=["organs"]
                        ),
                        "images": image_list,
                        "identification": model_to_dict(
                            report.identification, exclude=["organs"]
                        ),
                        "analysis": model_to_dict(report.analysis, exclude=["exam"]),
                        "exam": model_to_dict(report.analysis.exam),
                    }
                )

            analysis_form = AnalysisForm.objects.get(pk=analysis_id)
            entryform = EntryForm.objects.values().get(pk=analysis_form.entryform.pk)
            entryform_object = EntryForm.objects.get(
                pk=analysis_form.entryform.pk)
            subflow = entryform_object.get_subflow
            entryform["subflow"] = subflow
            identifications = list(
                Identification.objects.filter(
                    entryform=entryform["id"]).values()
            )

            samples = Sample.objects.filter(
                entryform=entryform["id"]).order_by("index")

            samples_as_dict = []
            for s in samples:
                s_dict = model_to_dict(
                    s, exclude=["organs", "exams",
                                "cassettes", "identification"]
                )
                # organs_set = s.organs.all().values()
                # exams_set = s.exams.all().values()
                # cassettes_set = Cassette.objects.filter(sample=s).values()
                # s_dict['organs_set'] = list(organs_set)
                # s_dict['exams_set'] = list(exams_set)
                # s_dict['cassettes_set'] = list(cassettes_set)
                organs = []
                sampleexams = s.sampleexams_set.all()
                sampleExa = {}
                for sE in sampleexams:
                    try:
                        sampleExa[sE.exam_id]["organ_id"].append(
                            {"name": sE.organ.name, "id": sE.organ.id}
                        )
                    except:
                        sampleExa[sE.exam_id] = {
                            "exam_id": sE.exam_id,
                            "exam_name": sE.exam.name,
                            "exam_type": sE.exam.service_id,
                            "sample_id": sE.sample_id,
                            "organ_id": [{"name": sE.organ.name, "id": sE.organ.id}],
                        }
                    if sE.exam.service_id in [1, 2, 3]:
                        if sE.organ in s.identification.organs_before_validations.all():
                            try:
                                organs.index(model_to_dict(sE.organ))
                            except:
                                organs.append(model_to_dict(sE.organ))
                        else:
                            for org in s.identification.organs_before_validations.all():
                                if org.organ_type == 2:
                                    try:
                                        organs.index(model_to_dict(org))
                                    except:
                                        organs.append(model_to_dict(org))
                s_dict["organs_set"] = organs
                s_dict["exams_set"] = sampleExa
                cassettes_set = []
                cassettes = Cassette.objects.filter(sample=s)
                for c in cassettes:
                    cassettes_set.append(
                        {
                            "cassette_name": c.cassette_name,
                            "entryform_id": c.entryform_id,
                            "id": c.id,
                            "index": c.index,
                            "sample_id": c.sample_id,
                            "organs_set": list(c.organs.values()),
                        }
                    )
                s_dict["cassettes_set"] = cassettes_set
                s_dict["identification"] = model_to_dict(s.identification)
                samples_as_dict.append(s_dict)

            entryform["identifications"] = list(
                entryform_object.identification_set.all().values()
            )
            # entryform["answer_questions"] = list(
            #     entryform_object.answerreceptioncondition_set.all().values())
            entryform["analyses"] = list(
                entryform_object.analysisform_set.all().values()
            )
            entryform["cassettes"] = list(
                entryform_object.cassette_set.all().values())
            entryform["customer"] = (
                entryform_object.customer.name if entryform_object.customer else ""
            )
            entryform["larvalstage"] = (
                entryform_object.larvalstage.name
                if entryform_object.larvalstage
                else ""
            )
            entryform["fixative"] = (
                entryform_object.fixative.name if entryform_object.fixative else ""
            )
            entryform["watersource"] = (
                entryform_object.watersource.name
                if entryform_object.watersource
                else ""
            )
            entryform["specie"] = (
                entryform_object.specie.name if entryform_object.specie else ""
            )

            data = {"reports": reports, "entryform": entryform}
        return JsonResponse(data)

    def post(self, request):
        var_post = request.POST.copy()

        analysis_id = var_post.get("analysis_id")
        slice_id = var_post.get("slice_id")
        sample_id = var_post.get("sample_id")
        organ_id = var_post.get("organ")
        organ_location_id = var_post.get("organ_location")
        pathology_id = var_post.get("pathology")
        diagnostic_id = var_post.get("diagnostic")
        diagnostic_distribution_id = var_post.get("diagnostic_distribution")
        diagnostic_intensity_id = var_post.get("diagnostic_intensity")

        sample = Sample.objects.get(pk=sample_id)
        report = Report.objects.create(
            analysis_id=analysis_id,
            slice_id=slice_id,
            sample=sample,
            organ_id=organ_id,
            organ_location_id=organ_location_id,
            pathology_id=pathology_id,
            diagnostic_id=diagnostic_id,
            diagnostic_distribution_id=diagnostic_distribution_id,
            diagnostic_intensity_id=diagnostic_intensity_id,
            identification=sample.identification,
        )
        report.save()

        return JsonResponse({"ok": True})

    def delete(self, request, report_id):
        if report_id:
            report = Report.objects.get(pk=report_id)
            report.delete()

        return JsonResponse({"ok": True})


class IMAGES(View):
    def post(self, request, report_id):
        try:
            if report_id:
                report = Report.objects.get(pk=report_id)
                var_post = request.POST.copy()
                desc = var_post.get("comments")
                img_file = request.FILES["file"]
                img = Img.objects.create(
                    file=img_file,
                    desc=desc,
                )
                report.images.add(img)
                return JsonResponse(
                    {
                        "ok": True,
                        "img_url": img.file.url,
                        "img_name": img.file.name.split("/")[-1],
                    }
                )
            else:
                return JsonResponse({"ok": False})
        except:
            return JsonResponse({"ok": False})


class RESPONSIBLE(View):
    http_method_names = ["get", "post", "delete"]

    def get(self, request):
        responsibles = Responsible.objects.filter(active=True)
        data = []
        for r in responsibles:
            data.append(model_to_dict(r))

        return JsonResponse({"ok": True, "responsibles": data})

    def post(self, request):
        try:
            var_post = request.POST.copy()
            responsible = Responsible()
            id = var_post.get("id", None)
            if id:
                responsible.id = id
            responsible.name = var_post.get("name", None)
            email_str = var_post.get("email", None)
            responsible.phone = var_post.get("phone", None)
            responsible.job = var_post.get("job", None)
            responsible.active = var_post.get("active", True)
            if email_str:
                responsible.email = email_str.strip().replace(" ", "")
            responsible.save()

            return JsonResponse({"ok": True})
        except Exception as e:
            return JsonResponse({"ok": False})

    def delete(self, request, id):
        responsible = Responsible.objects.get(pk=id)
        responsible.active = False
        responsible.save()

        return JsonResponse({"ok": True})


class SERVICE_REPORTS(View):
    http_method_names = ["get", "post", "delete"]

    def get(self, request, analysis_id):
        af = AnalysisForm.objects.get(pk=analysis_id)

        data = []
        for report in af.external_reports.all().order_by("-created_at"):
            data.append(
                {
                    "final_report": False,
                    "id": report.id,
                    "path": report.file.url,
                    "name": report.file.name.split("/")[-1],
                }
            )

        if af.final_reports.all():
            final_report = af.final_reports.all().order_by("-created_at").last()
            data.append(
                {
                    "final_report": True,
                    "id": final_report.id,
                    "path": final_report.path.url,
                    "name": final_report.path.name.split("/")[-1],
                }
            )
        else:
            try:
                final_report = FinalReport.objects.get(
                    grouper__analysisgrouper__analysis=af)
                data.append(
                    {
                        "final_report": True,
                        "id": final_report.id,
                        "path": final_report.path.url,
                        "name": final_report.path.name.split("/")[-1],
                    }
                )
            except FinalReport.DoesNotExist:
                final_report = ""

        return JsonResponse({"ok": True, "reports": data})

    def post(self, request, analysis_id):
        try:
            if analysis_id:
                af = AnalysisForm.objects.get(pk=analysis_id)
                file_report = request.FILES["file"]
                external_report = ExternalReport.objects.create(
                    file=file_report, loaded_by=request.user
                )
                af.external_reports.add(external_report)
                return JsonResponse(
                    {
                        "ok": True,
                        "file": {
                            "id": external_report.id,
                            "path": external_report.file.url,
                            "name": external_report.file.name.split("/")[-1],
                        },
                    }
                )
            else:
                return JsonResponse({"ok": False})
        except:
            return JsonResponse({"ok": False})

    def delete(self, request, analysis_id, id):
        try:
            report = ExternalReport.objects.get(pk=id)
            af = AnalysisForm.objects.get(pk=analysis_id)
            af.external_reports.remove(report)
            return JsonResponse({"ok": True})
        except:
            return JsonResponse({"ok": False})


class SERVICE_COMMENTS(View):
    http_method_names = ["get", "post", "delete"]

    def get(self, request, analysis_id):
        af = AnalysisForm.objects.get(pk=analysis_id)

        data = []
        for cmm in af.service_comments.all().order_by("-created_at"):
            response = {
                "id": cmm.id,
                "text": cmm.text,
                "created_at": cmm.created_at.strftime("%d/%m/%Y %H:%M:%S"),
                "done_by": cmm.done_by.get_full_name(),
            }
            data.append(response)

        return JsonResponse({"ok": True, "comments": data})

    def post(self, request, analysis_id):
        try:
            if analysis_id:
                af = AnalysisForm.objects.get(pk=analysis_id)
                var_post = request.POST.copy()
                comment = var_post.get("comment", None)
                if comment:
                    service_comment = ServiceComment.objects.create(
                        text=comment, done_by=request.user
                    )
                    af.service_comments.add(service_comment)
                    response = {
                        "id": service_comment.id,
                        "text": service_comment.text,
                        "created_at": service_comment.created_at.strftime(
                            "%d/%m/%Y %H:%M:%S"
                        ),
                        "done_by": service_comment.done_by.get_full_name(),
                    }
                    return JsonResponse({"ok": True, "comment": response})
                else:
                    return JsonResponse({"ok": True})
            else:
                return JsonResponse({"ok": False})
        except:
            return JsonResponse({"ok": False})

    def delete(self, request, analysis_id, id):
        try:
            sc = ServiceComment.objects.get(pk=id)
            af = AnalysisForm.objects.get(pk=analysis_id)
            af.service_comments.remove(sc)
            return JsonResponse({"ok": True})
        except:
            return JsonResponse({"ok": False})


class SERVICE_RESEARCHES(View):
    http_method_names = ["get", "post", "delete"]

    def get(self, request, analysis_id):
        af = AnalysisForm.objects.get(pk=analysis_id)

        data = []
        for rs in Research.objects.filter(services__in=[af]).distinct():
            response = {
                "id": rs.id,
                "code": rs.code,
                "name": rs.name,
                "description": rs.description,
                "status": rs.status,
            }
            data.append(response)

        return JsonResponse({"ok": True, "researches": data})

    def post(self, request, analysis_id):
        try:
            if analysis_id:
                af = AnalysisForm.objects.get(pk=analysis_id)
                var_post = request.POST.copy()
                researches = var_post.getlist("researches[]")
                # af.researches.clear()
                for r in Research.objects.all():
                    if r.services.filter(id=af.id).count():
                        r.services.remove(af)
                        r.save()
                for r in Research.objects.filter(id__in=researches):
                    r.services.add(af)
                    r.save()

                return JsonResponse({"ok": True})

            else:
                return JsonResponse({"ok": False})
        except:
            return JsonResponse({"ok": False})

    def delete(self, request, analysis_id, id):
        try:
            rs = Research.objects.get(pk=id)
            af = AnalysisForm.objects.get(pk=analysis_id)
            af.researches.remove(rs)
            return JsonResponse({"ok": True})
        except:
            return JsonResponse({"ok": False})


class EMAILTEMPLATE(View):
    def get(self, request, id=None):
        if id:
            template = EmailTemplate.objects.get(pk=id)
            data = model_to_dict(template, exclude=["cc"])
            return JsonResponse({"ok": True, "template": data})
        else:
            var_get = request.GET.copy()
            entryform = EntryForm.objects.get(pk=var_get["form"])
            responsible = Responsible.objects.filter(
                name=entryform.responsible, active=True
            ).first()
            email = ""
            if responsible:
                email = responsible.email
            templates = EmailTemplate.objects.all()
            data = []
            for r in templates:
                data.append(model_to_dict(r, exclude=["cc"]))

            return JsonResponse({"ok": True, "templates": data, "email": email})

    def post(self, request):
        try:
            var_post = request.POST.copy()
            from app import views as appv

            lang = var_post.get("lang", "es")
            formId = var_post.get("formId")
            doc = appv.get_resume_file(request.user, formId, lang)
            center = doc.entryform.center if doc.entryform.center else ""
            subject = "Recepción de muestras/" + doc.entryform.no_caso + "/" + center
            from_email = settings.EMAIL_HOST_USER
            to = var_post.get("to").split(",")
            message = var_post.get("body")
            plantilla = var_post.get("plantilla")
            bcc = []
            if plantilla:
                emailtemplate = EmailTemplate.objects.get(pk=plantilla)
                for cc in emailtemplate.cc.all():
                    bcc.append(cc.email)
            msg = EmailMultiAlternatives(
                subject, message, from_email, to, bcc=bcc)
            files = EmailTemplateAttachment.objects.filter(template=plantilla)
            for f in files:
                msg.attach_file(f.template_file.path)

            if settings.DEBUG:
                file_path = settings.BASE_DIR + settings.MEDIA_URL + "pdfs/"
            else:
                file_path = settings.MEDIA_ROOT + "/pdfs/"

            with open(file_path + "" + str(doc.file), "rb") as pdf:
                msg.attach(doc.filename, pdf.read(), "application/pdf")

            msg.send()

            DocumentResumeActionLog.objects.create(
                document=doc, mail_action=True, done_by=request.user
            )
            return JsonResponse({"ok": True})
        except Exception as e:
            print(e)
            return JsonResponse({"ok": False})


class CASE_FILES(View):
    http_method_names = ["get", "post", "delete"]

    def get(self, request, entryform_id):
        ef = EntryForm.objects.get(pk=entryform_id)

        data = []
        for file in ef.attached_files.all().order_by("-created_at"):
            data.append(
                {
                    "id": file.id,
                    "path": file.file.url,
                    "name": file.file.name.split("/")[-1],
                }
            )

        return JsonResponse({"ok": True, "files": data})

    def post(self, request, entryform_id):
        try:
            if entryform_id:
                ef = EntryForm.objects.get(pk=entryform_id)
                file = request.FILES["file"]
                case_file = CaseFile.objects.create(
                    file=file, loaded_by=request.user)
                ef.attached_files.add(case_file)
                return JsonResponse(
                    {
                        "ok": True,
                        "file": {
                            "id": case_file.id,
                            "path": case_file.file.url,
                            "name": case_file.file.name.split("/")[-1],
                        },
                    }
                )
            else:
                return JsonResponse({"ok": False})
        except:
            return JsonResponse({"ok": False})

    def delete(self, request, entryform_id, id):
        try:
            file = CaseFile.objects.get(pk=id)
            ef = EntryForm.objects.get(pk=entryform_id)
            ef.attached_files.remove(file)
            return JsonResponse({"ok": True})
        except:
            return JsonResponse({"ok": False})


class RESEARCH(View):
    http_method_names = ["get", "post", "delete"]

    def get(self, request, id):
        research = Research.objects.get(pk=id)
        # data = []
        # for r in responsibles:
        #     data.append(model_to_dict(r))

        up = UserProfile.objects.filter(user=request.user).first()

        research_analysis = research.services.all()

        fecha_actual = date.today()

        # Fecha de inicio que deseas filtrar
        fecha_inicio = date(2021, 1, 1)  # Reemplaza esta fecha con la que desees
        analysis = (
            AnalysisForm.objects.filter(
                exam__isnull=False, entryform__customer__in=research.clients.all(), created_at__range=(fecha_inicio, fecha_actual)
            )
            .exclude(id__in=research_analysis)
            .prefetch_related("entryform", "exam")
            .order_by("-entryform_id")
        )

        data1 = []
        data2 = []

        available_analysis = []

        for a in analysis:
            entryform_form = a.entryform.forms.first()
            analysisform_form = a.forms.first()

            if not entryform_form.cancelled and not analysisform_form.cancelled:
                available_analysis.append(
                    {
                        "analysis": a,
                        "entryform_form": entryform_form,
                        "analysisform_form": analysisform_form,
                    }
                )

        for a in available_analysis:
            parte = a["analysis"].entryform.get_subflow

            if parte == "N/A":
                parte = ""
            else:
                parte = " (Parte " + parte + ")"

            data1.append(
                {
                    "analisis": a["analysis"].id,
                    "no_caso": a["analysis"].entryform.no_caso + parte,
                    "exam": a["analysis"].exam.name,
                    "centro": a["analysis"].entryform.center,
                    "cliente": a["analysis"].entryform.customer.name,
                    "fecha_ingreso": a["analysis"].created_at.strftime("%d/%m/%Y"),
                    "fecha_muestreo": a["analysis"].entryform.sampled_at.strftime(
                        "%d/%m/%Y"
                    )
                    if a["analysis"].entryform.sampled_at
                    else "",
                    "f_m_year": a["analysis"].entryform.sampled_at.strftime("%Y")
                    if a["analysis"].entryform.sampled_at
                    else "",
                    "f_m_month": a["analysis"].entryform.sampled_at.strftime("%m")
                    if a["analysis"].entryform.sampled_at
                    else "",
                    "entryform": a["analysis"].entryform.id,
                    "estado": a["analysis"].status,
                    "edit_case": not a["entryform_form"].form_closed
                    and (up.profile.id in (1, 2, 3) or request.user.is_superuser),
                    "case_closed": a["entryform_form"].form_closed
                    or a["entryform_form"].cancelled,
                }
            )

        for a in research_analysis:
            parte = a.entryform.get_subflow
            if parte == "N/A":
                parte = ""
            else:
                parte = " (Parte " + parte + ")"

            data2.append(
                {
                    "analisis": a.id,
                    "no_caso": a.entryform.no_caso + parte,
                    "exam": a.exam.name,
                    "centro": a.entryform.center,
                    "cliente": a.entryform.customer.name,
                    "fecha_ingreso": a.created_at.strftime("%d/%m/%Y"),
                    "fecha_muestreo": a.entryform.sampled_at.strftime("%d/%m/%Y")
                    if a.entryform.sampled_at
                    else "",
                    "f_m_year": a.entryform.sampled_at.strftime("%Y")
                    if a.entryform.sampled_at
                    else "",
                    "f_m_month": a.entryform.sampled_at.strftime("%m")
                    if a.entryform.sampled_at
                    else "",
                    "entryform": a.entryform.id,
                    "estado": a.status,
                    "edit_case": not a.entryform.forms.get().form_closed
                    and (up.profile.id in (1, 2, 3) or request.user.is_superuser),
                    "case_closed": a.entryform.forms.get().form_closed
                    or a.entryform.forms.get().cancelled,
                }
            )

        clients_available = Customer.objects.all()
        users_available = User.objects.all()

        return render(
            request,
            "app/research.html",
            {
                "research": research,
                "casos1": data1,
                "casos2": data2,
                "analysis_selected": [RA.id for RA in research_analysis],
                "clients_available": clients_available,
                "users_available": users_available,
            },
        )

    def post(self, request, id):
        try:
            var_post = request.POST.copy()
            research = Research.objects.get(pk=id)
            analisis = var_post.getlist("analisis[]", [])
            research.services.clear()
            for af in AnalysisForm.objects.filter(id__in=analisis):
                research.services.add(af)
            research.save()

            return JsonResponse({"ok": True})
        except Exception as e:
            return JsonResponse({"ok": False})

    def delete(self, request, id):
        responsible = Responsible.objects.get(pk=id)
        responsible.active = False
        responsible.save()

        return JsonResponse({"ok": True})


def organs_by_slice(request, slice_id=None, sample_id=None):
    if slice_id and sample_id:
        slice_obj = Slice.objects.get(pk=slice_id)

        sample = Sample.objects.get(pk=sample_id)
        sampleExa = {}

        for sE in sample.sampleexams_set.all():
            try:
                sampleExa[sE.exam_id]["organ_id"].append(
                    {"name": sE.organ.name, "id": sE.organ.id}
                )
            except:
                sampleExa[sE.exam_id] = {
                    "exam_id": sE.exam_id,
                    "exam_name": sE.exam.name,
                    "exam_type": sE.exam.service_id,
                    "sample_id": sE.sample_id,
                    "organ_id": [{"name": sE.organ.name, "id": sE.organ.id}],
                }

        organs = []
        for key, value in sampleExa.items():
            if key == slice_obj.analysis.exam.id:
                for organ in value["organ_id"]:
                    # print (organ)
                    # ESTE IF NO DEBERIA APLICAR CON EL FIX DE ORGANOS EN CONJUNTO, DEBERIAN YA ESTAR TODOS LOS ORGANOS

                    # if organ['name'].upper() == "ALEVÍN" or organ['name'].upper() == "LARVA":
                    #     all_organs = Organ.objects.all()
                    #     for organ in all_organs:
                    #         organs.append({
                    #             "id":
                    #             organ.id,
                    #             "name":
                    #             organ.name.upper(),
                    #             "organ_locations":
                    #             list(organ.organlocation_set.all().values()),
                    #             "pathologys":
                    #             list(organ.pathology_set.all().values()),
                    #             "diagnostics":
                    #             list(organ.diagnostic_set.all().values()),
                    #             "diagnostic_distributions":
                    #             list(organ.diagnosticdistribution_set.all().values()),
                    #             "diagnostic_intensity":
                    #             list(organ.diagnosticintensity_set.all().values())
                    #         })
                    # else:
                    organ = Organ.objects.get(pk=organ["id"])
                    organs.append(
                        {
                            "id": organ.id,
                            "name": organ.name,
                            "organ_locations": list(
                                organ.organlocation_set.all().values()
                            ),
                            "pathologys": list(organ.pathology_set.all().values()),
                            "diagnostics": list(organ.diagnostic_set.all().values()),
                            "diagnostic_distributions": list(
                                organ.diagnosticdistribution_set.all().values()
                            ),
                            "diagnostic_intensity": list(
                                organ.diagnosticintensity_set.all().values()
                            ),
                        }
                    )

        data = {"organs": organs}

        return JsonResponse(data)


def set_analysis_comments(request, analysisform_id):
    try:
        analysis = AnalysisForm.objects.get(pk=analysisform_id)
        comments = request.POST.get("comments")
        analysis.comments = comments
        analysis.save()
        return JsonResponse({"ok": True})
    except:
        return JsonResponse({"ok": False})


def save_block_timing(request):
    try:
        var_post = request.POST.copy()

        block_cassette_pk = [
            v for k, v in var_post.items() if k.startswith("block_cassette_pk")
        ]

        block_start_block = [
            v for k, v in var_post.items() if k.startswith("block_start_block")
        ]

        block_end_block = [
            v for k, v in var_post.items() if k.startswith("block_end_block")
        ]

        block_start_slice = [
            v for k, v in var_post.items() if k.startswith("block_start_slice")
        ]

        block_end_slice = [
            v for k, v in var_post.items() if k.startswith("block_end_slice")
        ]

        zip_block = zip(
            block_cassette_pk,
            block_start_block,
            block_end_block,
            block_start_slice,
            block_end_slice,
        )

        for values in zip_block:
            _slices = Slice.objects.filter(
                cassette=Cassette.objects.get(pk=values[0]))
            for _slice in _slices:
                if values[1] != "":
                    _slice.start_block = (
                        datetime.strptime(
                            values[1], "%d/%m/%Y %H:%M:%S") or None
                    )
                if values[2] != "":
                    _slice.end_block = (
                        datetime.strptime(
                            values[2], "%d/%m/%Y %H:%M:%S") or None
                    )
                if values[3] != "":
                    _slice.start_slice = (
                        datetime.strptime(
                            values[3], "%d/%m/%Y %H:%M:%S") or None
                    )
                if values[4] != "":
                    _slice.end_slice = (
                        datetime.strptime(
                            values[4], "%d/%m/%Y %H:%M:%S") or None
                    )
                _slice.save()
        return JsonResponse({"ok": True})
    except:
        return JsonResponse({"ok": False})


def save_stain_timing(request):
    try:
        var_post = request.POST.copy()

        stain_slice_id = [
            v for k, v in var_post.items() if k.startswith("stain_slice_id")
        ]
        stain_start_stain = [
            v for k, v in var_post.items() if k.startswith("stain_start_stain")
        ]
        stain_end_stain = [
            v for k, v in var_post.items() if k.startswith("stain_end_stain")
        ]

        zip_stain = zip(stain_slice_id, stain_start_stain, stain_end_stain)

        for values in zip_stain:
            slice_new = Slice.objects.get(pk=values[0])
            if values[1] != "":
                slice_new.start_stain = (
                    datetime.strptime(values[1], "%d/%m/%Y %H:%M:%S") or None
                )
            if values[2] != "":
                slice_new.end_stain = (
                    datetime.strptime(values[2], "%d/%m/%Y %H:%M:%S") or None
                )
            slice_new.save()
        return JsonResponse({"ok": True})
    except Exception as e:
        print(e)
        return JsonResponse({"ok": False})


def save_scan_timing(request):
    try:
        var_post = request.POST.copy()

        scan_slice_id = [
            v for k, v in var_post.items() if k.startswith("scan_slice_id")
        ]
        scan_start_scan = [
            v for k, v in var_post.items() if k.startswith("scan_start_scan")
        ]
        scan_end_scan = [
            v for k, v in var_post.items() if k.startswith("scan_end_scan")
        ]
        scan_store = [v for k, v in var_post.items()
                      if k.startswith("scan_store")]

        zip_scan = zip(scan_slice_id, scan_start_scan,
                       scan_end_scan, scan_store)

        for values in zip_scan:
            slice_new = Slice.objects.get(pk=values[0])
            if values[1] != "":
                slice_new.start_scan = (
                    datetime.strptime(values[1], "%d/%m/%Y %H:%M:%S") or None
                )
            if values[2] != "":
                slice_new.end_scan = (
                    datetime.strptime(values[2], "%d/%m/%Y %H:%M:%S") or None
                )
            if values[3] != "":
                slice_new.slice_store = values[3]

            slice_new.save()
        return JsonResponse({"ok": True})
    except Exception as e:
        print(e)
        return JsonResponse({"ok": False})


# Any process function must to have a switcher for choice which method will be call
def process_entryform(request):
    step_tag = request.POST.get("step_tag")

    # try:
    switcher = {
        "step_1": step_1_entryform,
        "step_2": step_2_entryform,
        "step_3": step_3_entryform,
        "step_4": step_4_entryform,
        "step_3_new": step_new_analysis,
        "step_4_new": step_new_analysis2,
    }

    method = switcher.get(step_tag)

    if not method:
        raise NotImplementedError(
            "Method %s_entryform not implemented" % step_tag)

    return method(request)


def process_analysisform(request):
    step_tag = request.POST.get("step_tag")

    # try:
    switcher = {
        "step_1": step_1_analysisform,
        "step_2": step_2_analysisform,
        "step_3": step_3_analysisform,
        "step_4": step_4_analysisform,
        "step_5": step_5_analysisform,
    }

    method = switcher.get(step_tag)

    if not method:
        raise NotImplementedError(
            "Method %s_entryform not implemented" % step_tag)

    method(request)

    return True


# Steps Function for entry forms
def step_1_entryform(request):
    var_post = request.POST.copy()

    entryform = EntryForm.objects.get(pk=var_post.get("entryform_id"))

    entryform.analysisform_set.all().delete()
    Sample.objects.filter(entryform=entryform).delete()

    change = False
    if str(entryform.specie_id) != var_post.get("specie") and (
        entryform.specie_id == None and var_post.get("specie") != ""
    ):
        change = True
    entryform.specie_id = var_post.get("specie")

    if str(entryform.watersource_id) != var_post.get("watersource") and (
        entryform.watersource_id == None and var_post.get("watersource") != ""
    ):
        change = True
    entryform.watersource_id = var_post.get("watersource")

    if str(entryform.fixative_id) != var_post.get("fixative") and (
        entryform.fixative_id == None and var_post.get("fixative") != ""
    ):
        change = True
    entryform.fixative_id = var_post.get("fixative")

    if str(entryform.laboratory_id) != var_post.get("laboratory") and (
        entryform.laboratory_id == None and var_post.get("laboratory") != ""
    ):
        change = True
    entryform.laboratory_id = var_post.get("laboratory")

    if str(entryform.larvalstage_id) != var_post.get("larvalstage") and (
        entryform.larvalstage_id == None and var_post.get("larvalstage") != ""
    ):
        change = True
    entryform.larvalstage_id = var_post.get("larvalstage")

    # if str(entryform.observation) != var_post.get('observation') and (entryform.observation == None and var_post.get('observation') != ''):
    #     change = True
    # entryform.observation = var_post.get('observation')

    if str(entryform.customer_id) != var_post.get("customer") and (
        entryform.customer_id == None and var_post.get("customer") != ""
    ):
        change = True
    entryform.customer_id = var_post.get("customer")

    if str(entryform.entryform_type_id) != var_post.get("entryform_type") and (
        entryform.entryform_type_id == None and var_post.get(
            "entryform_type") != ""
    ):
        change = True
    entryform.entryform_type_id = var_post.get("entryform_type")

    if str(entryform.no_order) != var_post.get("no_order") and (
        entryform.no_order == None and var_post.get("no_order") != ""
    ):
        change = True
    entryform.no_order = var_post.get("no_order")

    # TODO: COMPROBAR LOS CAMBIOS DE HORARIO SERVER - BD
    try:
        if entryform.created_at != datetime.strptime(
            var_post.get("created_at"), "%d/%m/%Y %H:%M"
        ) and (
            entryform.created_at
            != datetime.strptime(var_post.get("created_at"), "%d/%m/%Y %H:%M")
            != ""
        ):
            # change = True
            pass
        entryform.created_at = datetime.strptime(
            var_post.get("created_at"), "%d/%m/%Y %H:%M"
        )
    except Exception as e:
        pass
    try:
        if entryform.sampled_at != datetime.strptime(
            var_post.get("sampled_at"), "%d/%m/%Y"
        ) and (
            entryform.sampled_at
            != datetime.strptime(var_post.get("sampled_at"), "%d/%m/%Y")
            != ""
        ):
            # change = True
            pass
        entryform.sampled_at = datetime.strptime(
            var_post.get("sampled_at"), "%d/%m/%Y")
    except:
        pass

    if str(entryform.sampled_at_hour) != var_post.get("sampled_at_hour") and (
        entryform.sampled_at_hour == None and var_post.get(
            "sampled_at_hour") != ""
    ):
        change = True
    entryform.sampled_at_hour = var_post.get("sampled_at_hour")

    if str(entryform.sampled_at_am_pm) != var_post.get("sampled_at_am_pm") and (
        entryform.sampled_at_am_pm == None and var_post.get(
            "sampled_at_am_pm") != ""
    ):
        change = True
    entryform.sampled_at_am_pm = var_post.get("sampled_at_am_pm")

    if str(entryform.center) != var_post.get("center") and (
        entryform.center == None and var_post.get("center") != ""
    ):
        change = True
    entryform.center = var_post.get("center")
    centers = Center.objects.filter(name=var_post.get("center"))
    if centers.count() <= 0:
        Center.objects.create(name=var_post.get("center"))

    if str(entryform.entry_format) != var_post.get("entry_format") and (
        entryform.entry_format == None and var_post.get("entry_format") != ""
    ):
        change = True
    entryform.entry_format = var_post.get("entry_format")

    if str(entryform.transfer_order) != var_post.get("transfer_order") and (
        entryform.transfer_order == None and var_post.get(
            "transfer_order") != ""
    ):
        change = True
    entryform.transfer_order = var_post.get("transfer_order")

    if str(entryform.responsible) != var_post.get("responsible") and (
        entryform.responsible == None and var_post.get("responsible") != ""
    ):
        change = True
    entryform.responsible = var_post.get("responsible")

    if str(entryform.company) != var_post.get("company") and (
        entryform.company == None and var_post.get("company") != ""
    ):
        change = True
    entryform.company = var_post.get("company")

    if str(entryform.no_request) != var_post.get("no_request") and (
        entryform.no_request == None and var_post.get("no_request") != ""
    ):
        change = True
    entryform.no_request = var_post.get("no_request")

    if str(entryform.anamnesis) != var_post.get("anamnesis") and (
        entryform.anamnesis == None and var_post.get("anamnesis") != ""
    ):
        change = True
    entryform.anamnesis = var_post.get("anamnesis")

    entryform.save()

    return True


def checkIdentification(olds, news):
    for v in news:
        ident = olds.filter(temp_id=v[4]).first()
        if not ident:
            return True
        if (
            ident.cage != v[0]
            or ident.group != v[1]
            or str(ident.no_container) != v[2]
            or str(ident.no_fish) != v[3]
            or ident.temp_id != v[4]
            or (ident.weight != v[5] and (v[5] != "0" and ident.weight == 0.0))
            or ident.extra_features_detail != v[6]
            or ident.is_optimum != True
            if "si" in v[7]
            else False or ident.observation != v[8]
        ):
            return True
        orgs = []
        for org in ident.organs.all():
            orgs.append(str(org.id))
        if len(orgs) != len(v[9]):
            return True
        for o in v[9]:
            if not o in orgs:
                return True
    return False


def step_2_entryform(request):
    var_post = request.POST.copy()
    entryform = EntryForm.objects.get(pk=var_post.get("entryform_id"))
    sample_correction = []

    index = 1

    # Processing correlative idents

    correlative_idents = Identification.objects.filter(
        entryform=entryform, samples_are_correlative=True
    ).order_by("id")

    for ident in correlative_idents:

        units = Unit.objects.filter(identification=ident).order_by("pk")

        unit_by_correlative = {}
        for unit in units:
            if unit.correlative in unit_by_correlative.keys():
                unit_by_correlative[unit.correlative].append(unit)
            else:
                unit_by_correlative[unit.correlative] = [unit]

        for k, v in unit_by_correlative.items():

            sample = Sample.objects.filter(
                entryform=entryform, index=index, identification=ident
            ).first()

            if not sample:
                sample = Sample.objects.create(
                    entryform=entryform, index=index, identification=ident
                )

            sample.save()
            sample_correction.append(sample)

            # Cleaning sample's unit organs not setted
            to_remove = []
            for ou in sample.unit_organs.all():
                if ou.pk not in list(map(lambda x: x.pk, v)):
                    to_remove.append(ou)

            for ou in to_remove:
                sample.unit_organs.remove(ou)

            # Adding new unit organs to sample
            for ou in OrganUnit.objects.filter(unit__in=map(lambda x: x.pk, v)):
                if ou.pk not in sample.unit_organs.all().values_list("pk", flat=True):
                    sample.unit_organs.add(ou)

            index += 1

    # Processing non-correlative idents

    non_correlative_idents = Identification.objects.filter(
        entryform=entryform, samples_are_correlative=False
    ).order_by("id")

    for ident in non_correlative_idents:
        units = Unit.objects.filter(
            identification=ident).order_by("correlative")
        organs_units = {}
        for unit in units:
            for uo in OrganUnit.objects.filter(unit=unit).order_by("id"):
                if uo.organ.pk in organs_units:
                    organs_units[uo.organ.pk].append(uo)
                else:
                    organs_units[uo.organ.pk] = [uo]

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
                    organs_ids_in_group = list(
                        map(lambda ou: ou.organ.pk, group))
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

                if index_sample.identification != ident:
                    new_sample = Sample.objects.create(
                        entryform=entryform, index=index, identification=ident
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

                if nexts_samples[0].identification != ident:
                    new_sample = Sample.objects.create(
                        entryform=entryform, index=index, identification=ident
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
                    entryform=entryform, index=index, identification=ident
                )

            sample = Sample.objects.filter(
                entryform=entryform, index=index, identification=ident
            ).first()
            sample_correction.append(sample)

            # Cleaning sample's unit organs not setted
            to_remove = []
            if sample:
                for ou in sample.unit_organs.all():
                    if ou.id not in list(map(lambda x: x.id, group)):
                        to_remove.append(ou)

                for ou in to_remove:
                    sample.unit_organs.remove(ou)
                    # SampleExams.objects.filter(sample=sample, unit_organ=ou).delete()

                # Adding new unit organs to sample
                for ou in group:
                    if ou.pk not in sample.unit_organs.all().values_list(
                        "pk", flat=True
                    ):
                        sample.unit_organs.add(ou)

            index += 1

    # Cleanning samples error

    sample_compare = Sample.objects.filter(entryform=entryform)
    sample_to_remove = []
    for sp in sample_compare:
        sample_list = list(map(lambda x: x.id, sample_correction))
        if sp.id not in sample_list:
            sample_to_remove.append(sp.id)

    for ou in sample_to_remove:
        Sample.objects.filter(id=ou).delete()

    return True


def checkSampleExams(olds, news):
    if len(olds) != len(news):
        return True
    for s in news:
        if not olds.filter(
            sample_id=s.sample_id, exam_id=s.exam_id, organ_id=s.organ_id
        ).first():
            return True
    return False


def step_3_entryform(request):
    var_post = request.POST.copy()
    entryform = EntryForm.objects.get(pk=var_post.get("entryform_id"))
    change = False
    sample_id = [v for k, v in var_post.items() if k.startswith("sample[id]")]

    general_exam_stains = {}

    for samp in sample_id:
        sample = Sample.objects.get(pk=int(samp))

        sample_exams = [
            v[0]
            for k, v in dict(var_post).items()
            if k.startswith("sample[exams][" + samp)
        ]
        sample_stains = [
            v[0]
            for k, v in dict(var_post).items()
            if k.startswith("sample[stain][" + samp)
        ]

        sample_exams_stains = list(zip(sample_exams, sample_stains))

        sample_organs = []
        bulk_data = []

        for se in SampleExams.objects.filter(sample=sample):
            exists = False
            for elem in sample_exams_stains:
                exams_stain = list(elem)
                if se.exam_id == int(exams_stain[0]) and se.stain_id == int(
                    exams_stain[1]
                ):
                    exists = True
                    break
            if not exists:
                se.delete()

        for exam_stain in sample_exams_stains:
            if exam_stain[0] in general_exam_stains.keys():
                general_exam_stains[exam_stain[0]].append(exam_stain[1])
            else:
                general_exam_stains[exam_stain[0]] = [exam_stain[1]]

            sample_organs = [
                v
                for k, v in dict(var_post).items()
                if k.startswith(
                    "sample[organs]["
                    + samp
                    + "]["
                    + exam_stain[0]
                    + "]["
                    + exam_stain[1]
                    + "]"
                )
            ]

            for se in SampleExams.objects.filter(
                sample=sample, exam_id=exam_stain[0], stain_id=exam_stain[1]
            ):
                if se.unit_organ_id is not None:
                    if (
                        str(se.organ_id) + "-" + str(se.organ_id)
                        not in sample_organs[0]
                    ):
                        se.delete()

            unit_organ_dict = {}
            for uo in sample.unit_organs.all():
                unit_organ_dict[uo.organ.id] = uo.id

            if len(sample_organs) > 0:
                for organ in sample_organs[0]:
                    uo_organ_id = organ.split("-")[0]
                    organ_id = organ.split("-")[1]
                    uo_id = unit_organ_dict[int(uo_organ_id)]

                    if (
                        SampleExams.objects.filter(
                            sample=sample,
                            exam_id=exam_stain[0],
                            stain_id=exam_stain[1],
                            organ_id=organ_id,
                            unit_organ_id=uo_id,
                        ).count()
                        == 0
                    ):
                        bulk_data.append(
                            SampleExams(
                                sample_id=sample.pk,
                                exam_id=exam_stain[0],
                                organ_id=organ_id,
                                unit_organ_id=uo_id,
                                stain_id=exam_stain[1],
                            )
                        )

        change = change or checkSampleExams(
            sample.sampleexams_set.all(), bulk_data)
        SampleExams.objects.bulk_create(bulk_data)
        sample.save()

    services = []
    for key, value in general_exam_stains.items():
        for item in value:
            services.append((key, item))

    for a, b in services:
        ex = Exam.objects.get(pk=a)

        if ex.service_id in [1, 3, 4, 5]:
            flow = Flow.objects.get(pk=2)
        else:
            flow = Flow.objects.get(pk=3)

        AFS = AnalysisForm.objects.filter(
            entryform_id=entryform.id, exam=ex, stain_id=b
        )
        if AFS.count() == 0:
            analysis_form = AnalysisForm.objects.create(
                entryform_id=entryform.id, exam=ex, stain_id=b
            )

            user = request.user

            count_days = 0
            date = analysis_form.created_at
            if analysis_form.exam.laboratory_deadline != None:
                while count_days < analysis_form.exam.laboratory_deadline:
                    date = date+timedelta(1)
                    if date.weekday() < 5:
                        count_days = count_days+1
                AnalysisTimes.objects.create(analysis=analysis_form, exam=analysis_form.exam, deadline=date.date(
                ), changeDeadline=False, type_deadline_id=1, created_by=user, service_comments=None)

            count_days = 0
            if analysis_form.exam.pathologist_deadline != None:
                while count_days < analysis_form.exam.pathologist_deadline:
                    date = date+timedelta(1)
                    if date.weekday() < 5:
                        count_days = count_days+1
                AnalysisTimes.objects.create(analysis=analysis_form, exam=analysis_form.exam, deadline=date.date(
                ), changeDeadline=False, type_deadline_id=2, created_by=user, service_comments=None)

            count_days = 0
            if analysis_form.exam.review_deadline != None:
                while count_days < analysis_form.exam.review_deadline:
                    date = date+timedelta(1)
                    if date.weekday() < 5:
                        count_days = count_days+1
                AnalysisTimes.objects.create(analysis=analysis_form, exam=analysis_form.exam, deadline=date.date(
                ), changeDeadline=False, type_deadline_id=3, created_by=user, service_comments=None)

            Form.objects.create(
                content_object=analysis_form,
                flow=flow,
                state=flow.step_set.all()[0].state,
                parent_id=entryform.forms.first().id,
            )
        else:
            AFS_list = list(AFS)
            for AF in AFS_list[1:]:
                AF.delete()

            sampleExams = SampleExams.objects.filter(
                sample__in=sample_id, exam=AFS_list[0].exam, stain=AFS_list[0].stain
            )

            # af_form = AFS_list[0].forms.get()
            # if af_form.cancelled and sampleExams.count() > 0:
            #     af_form.cancelled = False
            #     af_form.cancelled_at = None
            #     af_form.save()
            #     AFS_list[0].manual_cancelled_date = None
            #     AFS_list[0].manual_cancelled_by = None
            #     AFS_list[0].save()
    if change:
        changeCaseVersion(True, entryform.id, request.user.id)

    return 1


def step_4_entryform(request):
    var_post = request.POST.copy()

    entryform = EntryForm.objects.get(pk=var_post.get("entryform_id"))

    block_cassette_pk = [
        v for k, v in var_post.items() if k.startswith("block_cassette_pk")
    ]

    block_start_block = [
        v for k, v in var_post.items() if k.startswith("block_start_block")
    ]

    block_end_block = [
        v for k, v in var_post.items() if k.startswith("block_end_block")
    ]

    block_start_slice = [
        v for k, v in var_post.items() if k.startswith("block_start_slice")
    ]

    block_end_slice = [
        v for k, v in var_post.items() if k.startswith("block_end_slice")
    ]

    zip_block = zip(
        block_cassette_pk,
        block_start_block,
        block_end_block,
        block_start_slice,
        block_end_slice,
    )

    for values in zip_block:
        _slices = Slice.objects.filter(
            cassette=Cassette.objects.get(pk=values[0]))
        for _slice in _slices:
            _slice.start_block = (
                datetime.strptime(values[1], "%d/%m/%Y %H:%M:%S") or None
            )
            _slice.end_block = datetime.strptime(
                values[2], "%d/%m/%Y %H:%M:%S") or None
            _slice.start_slice = (
                datetime.strptime(values[3], "%d/%m/%Y %H:%M:%S") or None
            )
            _slice.end_slice = datetime.strptime(
                values[4], "%d/%m/%Y %H:%M:%S") or None
            _slice.save()

    return True


def step_5_entryform(request):
    return True


def changeCaseVersion(allow_new, form_id, user_id):
    versions = CaseVersion.objects.filter(entryform_id=form_id)
    if len(versions) or allow_new:
        CaseVersion.objects.create(
            entryform_id=form_id, version=len(versions) + 1, generated_by_id=user_id
        )


def step_new_analysis(request):
    var_post = request.POST.copy()
    entryform = EntryForm.objects.get(pk=var_post.get("entryform_id"))

    exams_to_do = var_post.getlist("analysis")
    analyses_qs = entryform.analysisform_set.all()

    for analysis in analyses_qs:
        analysis.forms.get().delete()

    analyses_qs.delete()

    for exam in exams_to_do:
        ex = Exam.objects.get(pk=exam)
        if (
            AnalysisForm.objects.filter(
                entryform_id=entryform.id, exam_id=exam).count()
            == 0
        ):
            if ex.service_id in [1, 3, 4]:
                flow = Flow.objects.get(pk=2)
            elif ex.service_id == 5:
                continue
            else:
                flow = Flow.objects.get(pk=3)

            analysis_form = AnalysisForm.objects.create(
                entryform_id=entryform.id, exam=ex, stain=ex.stain
            )

            Form.objects.create(
                content_object=analysis_form,
                flow=flow,
                state=flow.step_set.all()[0].state,
                parent_id=entryform.forms.first().id,
            )

    sample_id = [v for k, v in var_post.items() if k.startswith("sample[id]")]

    for values in sample_id:
        sample = Sample.objects.get(pk=int(values))
        sample_exams = [
            v[0]
            for k, v in dict(var_post).items()
            if k.startswith("sample[exams][" + values)
        ]
        sample_organs = []
        for exam in sample_exams:
            sample_organs = [
                v
                for k, v in dict(var_post).items()
                if k.startswith("sample[organs][" + values + "][" + exam)
            ]
            for organ in sample_organs[0]:
                if (
                    SampleExams.objects.filter(
                        sample=sample, exam_id=exam, organ_id=organ
                    ).count()
                    == 0
                ):
                    SampleExams.objects.create(
                        sample=sample, exam_id=exam, organ_id=organ
                    )
                    for cassette in Cassette.objects.filter(sample=sample):
                        if not len(cassette.organs.filter(id=organ)):
                            cassette.organs.add(organ)
                            cassette.save()

        for cassette in Cassette.objects.filter(sample=sample):
            cassette.slice_set.all().delete()
            exams = [
                sampleexam.exam
                for sampleexam in sample.sampleexams_set.all()
                if sampleexam.exam.service_id in [1, 2, 3]
            ]
            _exams = []
            exams_uniques = []

            for item in exams:
                if item.pk not in exams_uniques:
                    exams_uniques.append(item.pk)
                    _exams.append(item)

            slice_index = 0

            for index, val in enumerate(_exams):
                slice_index = index + 1
                slice_name = cassette.cassette_name + "-S" + str(slice_index)

                analysis_form = AnalysisForm.objects.filter(
                    entryform_id=entryform.id,
                    exam_id=val.id,
                ).first()

                slice_new = Slice.objects.create(
                    entryform_id=entryform.id,
                    slice_name=slice_name,
                    index=slice_index,
                    cassette=cassette,
                    analysis=analysis_form,
                )
                slice_new.save()

    return False


def step_new_analysis2(request):
    var_post = request.POST.copy()
    entryform = EntryForm.objects.get(pk=var_post.get("entryform_id"))

    exams_to_do = var_post.getlist("analysis")
    analyses_qs = entryform.analysisform_set.all()

    new_analysisform = {}
    for exam in exams_to_do:
        ex = Exam.objects.get(pk=exam)
        if (
            AnalysisForm.objects.filter(
                entryform_id=entryform.id, exam_id=exam).count()
            == 0
        ):
            if ex.service_id in [1, 3, 4]:
                flow = Flow.objects.get(pk=2)
            elif ex.service_id == 5:
                continue
            else:
                flow = Flow.objects.get(pk=3)

            analysis_form = AnalysisForm.objects.create(
                entryform_id=entryform.id, exam=ex, stain=ex.stain
            )
            new_analysisform[exam] = analysis_form.pk

            Form.objects.create(
                content_object=analysis_form,
                flow=flow,
                state=flow.step_set.all()[0].state,
                parent_id=entryform.forms.first().id,
            )

    sample_id = [v for k, v in var_post.items() if k.startswith("sample[id]")]

    for values in sample_id:
        sample = Sample.objects.get(pk=int(values))
        sample_exams = [
            v[0]
            for k, v in dict(var_post).items()
            if k.startswith("sample[exams][" + values)
        ]
        sample_organs = []
        for exam in sample_exams:
            sample_organs = [
                v
                for k, v in dict(var_post).items()
                if k.startswith("sample[organs][" + values + "][" + exam)
            ]
            for organ in sample_organs[0]:
                if (
                    SampleExams.objects.filter(
                        sample=sample, exam_id=exam, organ_id=organ
                    ).count()
                    == 0
                ):
                    SampleExams.objects.create(
                        sample=sample, exam_id=exam, organ_id=organ
                    )
                    for cassette in Cassette.objects.filter(samples__in=[sample]):
                        if not len(cassette.organs.filter(id=organ)):
                            cassette.organs.add(organ)
                            cassette.save()

            if new_analysisform.get(exam, None):
                for cassette in Cassette.objects.filter(sample=sample):
                    last_slice_from_cassette = Slice.objects.filter(
                        cassette=cassette
                    ).last()
                    last_slice_from_cassette.pk = None
                    old_index = last_slice_from_cassette.index
                    new_index = old_index + 1
                    last_slice_from_cassette.index = new_index
                    last_slice_from_cassette.analysis_id = new_analysisform.get(
                        exam, None
                    )
                    last_slice_from_cassette.slice_name = (
                        last_slice_from_cassette.slice_name.replace(
                            "S" + str(old_index), "S" + str(new_index)
                        )
                    )
                    last_slice_from_cassette.save()

    return False


def step_1_analysisform(request):
    var_post = request.POST.copy()

    stain_slice_id = [
        v for k, v in var_post.items() if k.startswith("stain_slice_id")]
    stain_start_stain = [
        v for k, v in var_post.items() if k.startswith("stain_start_stain")
    ]
    stain_end_stain = [
        v for k, v in var_post.items() if k.startswith("stain_end_stain")
    ]

    zip_stain = zip(stain_slice_id, stain_start_stain, stain_end_stain)

    for values in zip_stain:
        slice_new = Slice.objects.get(pk=values[0])
        slice_new.start_stain = (
            datetime.strptime(values[1], "%d/%m/%Y %H:%M:%S") or None
        )
        slice_new.end_stain = datetime.strptime(
            values[2], "%d/%m/%Y %H:%M:%S") or None
        slice_new.start_scan = None
        slice_new.end_scan = None
        slice_new.slice_store = None

        slice_new.save()


def step_2_analysisform(request):
    var_post = request.POST.copy()

    scan_slice_id = [
        v for k, v in var_post.items() if k.startswith("scan_slice_id")]
    scan_start_scan = [
        v for k, v in var_post.items() if k.startswith("scan_start_scan")
    ]
    scan_end_scan = [
        v for k, v in var_post.items() if k.startswith("scan_end_scan")]
    scan_store = [v for k, v in var_post.items() if k.startswith("scan_store")]

    zip_scan = zip(scan_slice_id, scan_start_scan, scan_end_scan, scan_store)

    for values in zip_scan:
        slice_new = Slice.objects.get(pk=values[0])
        slice_new.start_scan = datetime.strptime(
            values[1], "%d/%m/%Y %H:%M:%S") or None
        slice_new.end_scan = datetime.strptime(
            values[2], "%d/%m/%Y %H:%M:%S") or None
        slice_new.slice_store = values[3]
        slice_new.box_id = None
        slice_new.save()


def step_3_analysisform(request):
    var_post = request.POST.copy()

    store_slice_id = [v for k, v in var_post.items(
    ) if k.startswith("store[slice_id]")]
    store_box_id = [v for k, v in var_post.items(
    ) if k.startswith("store[box_id]")]

    zip_store = zip(store_slice_id, store_box_id)

    for values in zip_store:
        slice_new = Slice.objects.get(pk=values[0])
        slice_new.box_id = values[1]
        slice_new.report_set.all().delete()
        slice_new.save()


def step_4_analysisform(request):
    print("Step 4 Analysis Form")


def step_5_analysisform(request):
    var_post = request.POST.copy()

    analysis_id = var_post.get("analysis_id")
    no_reporte = var_post.get("no_reporte")
    box_findings = var_post.get("box-findings").replace("\\r\\n", "")
    box_diagnostic = var_post.get("box-diagnostics").replace("\\r\\n", "")
    box_comments = var_post.get("box-comments").replace("\\r\\n", "")
    box_tables = var_post.get("box-tables").replace("\\r\\n", "")
    ReportFinal.objects.filter(analysis_id=analysis_id).delete()
    ReportFinal.objects.create(
        analysis_id=analysis_id,
        no_reporte=no_reporte,
        box_findings=box_findings,
        box_diagnostics=box_diagnostic,
        box_comments=box_comments,
        box_tables=box_tables,
    )


# Generic function for call any process method for any model_form
def call_process_method(model_name, request):
    method_name = "process_" + str(model_name)
    possibles = globals().copy()
    possibles.update(locals())
    method = possibles.get(method_name)
    if not method:
        raise NotImplementedError("Method %s not implemented" % method_name)
    return method(request)


def save_identification(request, id):
    var_post = request.POST.copy()
    change = False
    ident = Identification.objects.get(pk=id)
    if ident.cage != var_post["jaula"]:
        change = True
    ident.cage = var_post["jaula"]

    if ident.group != var_post["grupo"]:
        change = True
    ident.group = var_post["grupo"]

    if str(ident.no_container) != var_post["contenedores"]:
        change = True
    ident.no_container = var_post["contenedores"]

    if ident.weight != var_post["peso"] and (
        var_post["peso"] != "0" and ident.weight == 0.0
    ):
        change = True
    ident.weight = var_post["peso"]

    if ident.extra_features_detail != var_post["extras"]:
        change = True
    ident.extra_features_detail = var_post["extras"]

    if ident.observation != var_post["observation"]:
        change = True
    ident.observation = var_post["observation"]

    if ident.is_optimum != True if "1" == var_post["optimo"] else False:
        change = True
    ident.is_optimum = var_post["optimo"]

    if ident.no_fish != var_post["no_fish"]:
        change = True
        identification_ids = Identification.objects.filter(
            entryform=ident.entryform
        ).values_list("id", flat=True)
        current_total_samples = Sample.objects.filter(
            identification__in=identification_ids
        ).order_by("-index")
        current_ident_samples = Sample.objects.filter(identification=ident).order_by(
            "-index"
        )
        new_samples = int(var_post["no_fish"]) - current_ident_samples.count()
        max_index = (
            current_total_samples.first().index
            if current_total_samples.count() > 0
            else 0
        )
        new_counter_index = 0
        for i in range(
            len(current_total_samples), len(
                current_total_samples) + new_samples
        ):
            sample = Sample.objects.create(
                entryform=ident.entryform,
                index=max_index + new_counter_index + 1,
                identification=ident,
            )
            new_counter_index += 1

    ident.no_fish = var_post["no_fish"]

    organs = var_post.getlist("organs")
    orgs = []
    for org in ident.organs_before_validations.all():
        orgs.append(str(org.id))
    if len(orgs) != len(organs):
        change = True
    for o in organs:
        if not o in orgs:
            change = True

    ident.organs.set([])
    ident.organs_before_validations.set([])

    organs_type2_count = Organ.objects.filter(
        id__in=organs, organ_type=2).count()
    if organs_type2_count > 0:
        for org in Organ.objects.all():
            ident.organs.add(org)
    else:
        for org in organs:
            ident.organs.add(int(org))

    for org in organs:
        ident.organs_before_validations.add(int(org))

    ident.save()

    if change:
        ident.removable = False
        ident.save()
        changeCaseVersion(True, ident.entryform.id, request.user.id)
    return JsonResponse({})


def list_identification(request, entryform_id):
    # try:
    organs = list(Organ.objects.all().values())

    ident = []
    for i in Identification.objects.filter(entryform_id=entryform_id):
        ident_as_dict = model_to_dict(
            i,
            exclude=[
                "organs",
                "organs_before_validations",
                "no_fish",
                "no_container",
                "temp_id",
            ],
        )
        ident.append(ident_as_dict)

    data = {
        "ident": ident,
        "organs": organs,
    }
    return JsonResponse({"ok": 1, "data": data})
    # except :
    #     return JsonResponse({'ok': 0})


def list_units(request, identification_id):
    try:
        units = []
        for u in Unit.objects.filter(identification_id=identification_id):
            unit = model_to_dict(u)
            unit["organs"] = []
            for ou in OrganUnit.objects.filter(unit=u):
                unit["organs"].append(model_to_dict(ou.organ))
            units.append(unit)

        return JsonResponse({"ok": 1, "units": units})
    except:
        return JsonResponse({"ok": 0})


def create_unit(request, identification_id, correlative):
    unit = Unit.objects.create(
        identification_id=identification_id, correlative=correlative
    )
    return JsonResponse({"ok": 1, "unit": model_to_dict(unit)})


def save_units(request):
    units = json.loads(request.POST.get("units"))
    ok = 1
    for unit in units:
        unit_obj = Unit.objects.get(pk=unit["id"])
        unit_obj.correlative = unit["correlative"]
        unit_obj.save()

        organs_fmt = list(map(lambda x: int(x.split("-")[0]), unit["organs"]))

        # Check if organs previously saved must exists in new organs set.
        # If it doesn't exists must be removed
        org_already_used = []
        for ou in OrganUnit.objects.filter(unit=unit_obj):
            ou_exists_in_new_set = False
            for org in organs_fmt:
                if ou.organ.pk == org and org not in org_already_used:
                    ou_exists_in_new_set = True
                    org_already_used.append(org)
                    break

            if not ou_exists_in_new_set:

                # # Check if the organ is used in a Cassette of that unit
                # # If it's being used then don't delete it and skip to the next organ
                # cassettes = LabCassette.objects.filter(unit=unit_obj)
                # cassettes_organs = LabCassetteOrgan.objects.filter(
                #     cassette_id__in=cassettes.values_list("id", flat=True),
                #     organ=ou.organ,
                # )

                # if cassettes_organs.count() > 0:
                #     ok = 0
                #     continue

                # Check if there are samples with the OrganUnit.
                # If they exist then validate if when removing the OrgaUnit the sample remains empty, therefore it must also be removed.
                samples = Sample.objects.filter(unit_organs__in=[ou.id])
                for s in samples:
                    s.unit_organs.remove(ou)
                    SampleExams.objects.filter(unit_organ=ou).delete()

                    if s.unit_organs.all().count() == 0:
                        SampleExams.objects.filter(sample=s).delete()
                        s.delete()

                ou.delete()

        unit_organs = OrganUnit.objects.filter(unit=unit_obj)

        # Check if new organs set exists in unit.
        # Just if it doesn't exists must be created as OrganUnit.
        ou_already_used = []
        for org in organs_fmt:
            new_org_exists_in_unit = False
            for ou in unit_organs:
                if ou.organ.pk == org and ou.id not in ou_already_used:
                    new_org_exists_in_unit = True
                    ou_already_used.append(ou.id)
                    break

            if not new_org_exists_in_unit:
                OrganUnit.objects.create(unit=unit_obj, organ_id=org)

    if ok:
        return JsonResponse({"ok": 1})

    return JsonResponse({"ok": 0, "message": "CASSETTES"})


def remove_unit(request, id):
    cassettes = LabCassette.objects.filter(unit_id=id)

    if cassettes.count() > 0:
        return JsonResponse({"ok": 0, "message": "CASSETTES"})

    for OU in OrganUnit.objects.filter(unit_id=id):
        samples = Sample.objects.filter(unit_organs__in=[OU.id])
        for s in samples:
            s.unit_organs.remove(OU)
            if s.unit_organs.all().count() == 0:
                s.delete()
    Unit.objects.get(pk=id).delete()
    return JsonResponse({"ok": 1})


def new_empty_identification(request, entryform_id, correlative):
    try:
        ident = Identification.objects.create(
            entryform_id=entryform_id,
            temp_id="".join(
                random.choices(string.ascii_uppercase + string.digits, k=11)
            ),
            removable=True,
            correlative=correlative,
        )
        return JsonResponse({"ok": 1, "id": ident.id, "obj": model_to_dict(ident)})
    except:
        return JsonResponse({"ok": 0})


def save_new_identification(request, id):
    var_post = request.POST.copy()
    change = False
    ident = Identification.objects.get(pk=id)

    if ident.cage != var_post["cage"]:
        change = True
        ident.cage = var_post["cage"]

    if ident.group != var_post["group"]:
        change = True
        ident.group = var_post["group"]

    if (
        ident.weight != var_post["weight"]
        and var_post["weight"]
        and var_post["weight"].strip() != ""
    ):
        change = True
        ident.weight = var_post["weight"]

    if ident.extra_features_detail != var_post["extra_features_detail"]:
        change = True
        ident.extra_features_detail = var_post["extra_features_detail"].strip()

    if ident.observation != var_post["observation"]:
        change = True
        ident.observation = var_post["observation"].strip()

    if ident.is_optimum != (True if "1" == var_post["is_optimum"] else False):
        change = True
        ident.is_optimum = True if "1" == var_post["is_optimum"] else False

    if ident.client_case_number != var_post["client_case_number"]:
        change = True
        ident.client_case_number = var_post["client_case_number"].strip()

    if ident.quantity != var_post["quantity"]:
        change = True
        ident.quantity = int(var_post["quantity"])

    if ident.correlative != var_post["correlative"]:
        change = True
        ident.correlative = int(var_post["correlative"])

    if ident.samples_are_correlative != (
        True if "1" == var_post["samples_are_correlative"] else False
    ):
        change = True
        ident.samples_are_correlative = var_post["samples_are_correlative"]

    ident.save()

    if change:
        ident.removable = False
        ident.save()
        changeCaseVersion(True, ident.entryform.id, request.user.id)
    return JsonResponse({"ok": 1})


def remove_identification(request, id):
    try:
        units = Unit.objects.filter(identification_id=id)
        cassettes = LabCassette.objects.filter(
            unit_id__in=units.values_list("id", flat=True)
        )

        if cassettes.count() > 0:
            return JsonResponse({"ok": 0, "message": "CASSETTES"})

        units.delete()
        Sample.objects.filter(identification_id=id).delete()
        Identification.objects.get(pk=id).delete()
    except:
        return JsonResponse({"ok": 1})


def save_generalData(request, id):
    """
    Updates the given id's :model:`backend.EntryForm`,
    creating a new :model:`backend.CaseVersion` when any change
    is registered.
    """
    var_post = request.POST.copy()
    entry = EntryForm.objects.get(pk=id)

    change = any(key for key in var_post.items())

    entry.specie_id = int(var_post["specie"])
    entry.laboratory_id = int(var_post["laboratory"])
    entry.watersource_id = int(var_post["watersource"])
    entry.larvalstage_id = int(var_post["larvalstage"])
    if "fixative" in var_post and var_post["fixative"]:
        entry.fixative_id = int(var_post["fixative"])
    entry.customer_id = int(var_post["client"])
    entry.entryform_type_id = int(var_post["entryform_type"])
    entry.entry_format = int(var_post["entry_format"])
    entry.company = var_post["company"]
    entry.center = var_post["center"]
    entry.responsible = var_post["responsable"]
    entry.no_order = var_post["no_order"]
    entry.no_request = var_post["no_solic"]
    entry.transfer_order = var_post["transfer_order"]
    entry.anamnesis = var_post["anamnesis"]
    entry.sampled_at_hour = var_post["sampled_at_hour"]
    entry.sampled_at_am_pm = var_post["sampled_at_am_pm"]

    try:
        entry.created_at = datetime.strptime(
            var_post.get("recive"), "%d/%m/%Y %H:%M")
        entry.sampled_at = datetime.strptime(
            var_post.get("muestreo"), "%d/%m/%Y")
    except:
        pass

    if change:
        changeCaseVersion(True, id, request.user.id)

    entry.save()

    return JsonResponse({})


def sendEmailNotification(request):
    # form, current_state, next_state):
    var_post = request.GET.copy()

    form = Form.objects.get(pk=var_post.get("form_id"))
    next_state = form.state
    previous_step = strtobool(var_post.get("previous_step"))
    if not previous_step:
        current_state = Permission.objects.get(
            to_state=form.state, type_permission="w"
        ).from_state
    else:
        current_state = Permission.objects.get(
            from_state=form.state, type_permission="w"
        ).to_state

    content_type = form.content_type.model
    caso = ""
    exam = ""
    template = "app/notification.html"
    if content_type == "analysisform":
        caso = form.parent.content_object.no_caso
        exam = form.content_object.exam.name
        template = "app/notification1.html"
    else:
        caso = form.content_object.no_caso

    users = []
    if next_state.id < 10:
        users = User.objects.filter(userprofile__profile_id__in=[1, 3]).values_list(
            "first_name", "last_name", "email"
        )
    else:
        users = list(
            User.objects.filter(userprofile__profile_id__in=[1]).values_list(
                "first_name", "last_name", "email"
            )
        )
        if form.content_object.patologo:
            users.append(
                (
                    form.content_object.patologo.first_name,
                    form.content_object.patologo.last_name,
                    form.content_object.patologo.email,
                )
            )
    for f, l, e in users:
        subject = "Notificación: Acción Requerida Caso " + caso
        to = [e]
        # to = ['wcartaya@dataqu.cl']
        from_email = settings.EMAIL_HOST_USER

        ctx = {
            "name": f + " " + l,
            "nro_caso": caso,
            "etapa_last": current_state.name,
            "etapa_current": next_state.name,
            "url": settings.SITE_URL
            + "/workflow/"
            + str(form.id)
            + "/"
            + next_state.step.tag,
            "exam": exam,
        }
        message = get_template(template).render(context=ctx)
        msg = EmailMultiAlternatives(subject, message, from_email, to)
        msg.content_subtype = "html"
        # msg.send()
    return JsonResponse({})


def completeForm(request, form_id):
    form = Form.objects.get(pk=form_id)
    form.form_closed = True
    form.closet_at = datetime.now()
    form.save()
    return JsonResponse({"ok": True})


def finishReception(request, form_id):
    form = Form.objects.get(pk=form_id)
    form.reception_finished = True
    form.reception_finished_at = datetime.now()
    form.save()
    return JsonResponse({"ok": True})


def save_step1(request, form_id):
    valid = step_1_entryform(request)
    return JsonResponse({"ok": valid})


def service_assignment(request):
    var_post = request.POST.copy()
    analysis = var_post.get("analysis", None)
    pathologist = var_post.get("pathologist", None)
    comment = var_post.get("comment", None)

    template = "app/template_assignment.html"
    from_email = settings.EMAIL_HOST_USER2
    connection = mail.get_connection(
        username=settings.EMAIL_HOST_USER2,
        password=settings.EMAIL_HOST_PASSWORD2,
    )
    msg_res = ""

    try:
        if analysis:
            af = AnalysisForm.objects.get(pk=int(analysis))
            to = ""
            message = ""
            samples = Sample.objects.filter(entryform=af.entryform).values_list(
                "id", flat=True
            )
            nro_samples = SampleExams.objects.filter(
                sample__in=samples, exam=af.exam
            ).count()

            deadline = AnalysisTimes.objects.filter(
                analysis_id=af.id, type_deadline_id=3).last()
            if not af.patologo and pathologist != "NA":
                # Asignando patologo por primera vez
                af.patologo_id = int(pathologist)
                af.assignment_comment = comment if comment and comment != "" else None
                af.assignment_done_at = datetime.now()
                af.save()
                af.refresh_from_db()
                to = af.patologo.email
                subject = (
                    "Derivación de Análisis/"
                    + af.entryform.no_caso
                    + "/"
                    + af.exam.name
                )
                ctx = {
                    "msg": "Informamos derivación de análisis "
                    + af.exam.name
                    + ", correspondiente al caso "
                    + af.entryform.no_caso
                    + " ("
                    + str(nro_samples)
                    + " muestras) ingresado el "
                    + af.created_at.strftime("%d/%m/%Y"),
                    "deadline": deadline.deadline.strftime("%d/%m/%Y")
                    if deadline else "",
                    "comment": af.assignment_comment if af.assignment_comment else "",
                }
                message = get_template(template).render(context=ctx)
                msg = EmailMultiAlternatives(
                    subject, message, from_email, [to], connection=connection
                )
                msg.content_subtype = "html"
                try:
                    msg.send()
                except:
                    msg_res = "No ha sido posible enviar el correo de notificación"
                    pass

            elif af.patologo and pathologist != "NA":
                # Reemplazando al patologo anterior
                prev_patologo = af.patologo
                af.patologo_id = int(pathologist)
                af.assignment_comment = comment if comment and comment != "" else None
                af.assignment_done_at = datetime.now()
                af.pre_report_started = False
                af.pre_report_started_at = None
                af.pre_report_ended = False
                af.pre_report_ended_at = None
                af.save()
                af.refresh_from_db()

                # Al nuevo
                to = af.patologo.email
                subject = (
                    "Derivación de Análisis/"
                    + af.entryform.no_caso
                    + "/"
                    + af.exam.name
                )
                ctx = {
                    "msg": "Informamos que se ha reasignado a usted el análisis "
                    + af.exam.name
                    + ", correspondiente al caso "
                    + af.entryform.no_caso
                    + " ("
                    + str(nro_samples)
                    + " muestras) ingresado el "
                    + af.created_at.strftime("%d/%m/%Y"),
                    "deadline": deadline.deadline.strftime("%d/%m/%Y"),
                    "comment": af.assignment_comment if af.assignment_comment else "",
                }
                message = get_template(template).render(context=ctx)
                msg = EmailMultiAlternatives(
                    subject, message, from_email, [to], connection=connection
                )
                msg.content_subtype = "html"
                try:
                    msg.send()
                except:
                    msg_res = "No ha sido posible enviar el correo de notificación"
                    pass

                # Al anterior
                to = prev_patologo.email
                subject = (
                    "Reasignación de Análisis/"
                    + af.entryform.no_caso
                    + "/"
                    + af.exam.name
                )
                ctx = {
                    "msg": "Informamos que el análisis "
                    + af.exam.name
                    + " que estaba asignado a usted, correspondiente al caso "
                    + af.entryform.no_caso
                    + ", ha sido reasignado.",
                }
                message = get_template(template).render(context=ctx)
                msg = EmailMultiAlternatives(
                    subject, message, from_email, [to], connection=connection
                )
                msg.content_subtype = "html"
                try:
                    msg.send()
                except:
                    msg_res = "No ha sido posible enviar el correo de notificación"
                    pass
            elif af.patologo and pathologist == "NA":
                # Desasignando patologo
                prev_patologo = af.patologo
                af.patologo_id = None
                af.assignment_deadline = None
                af.assignment_comment = comment if comment and comment != "" else None
                af.assignment_done_at = None
                af.save()
                af.refresh_from_db()
                to = prev_patologo.email
                subject = (
                    "Reasignación de Análisis/"
                    + af.entryform.no_caso
                    + "/"
                    + af.exam.name
                )
                ctx = {
                    "msg": "Informamos que el análisis "
                    + af.exam.name
                    + " que estaba asignado a usted, correspondiente al caso "
                    + af.entryform.no_caso
                    + ", ha sido reasignado.",
                    "comment": af.assignment_comment if af.assignment_comment else "",
                }
                message = get_template(template).render(context=ctx)
                msg = EmailMultiAlternatives(
                    subject, message, from_email, [to], connection=connection
                )
                msg.content_subtype = "html"
                try:
                    msg.send()
                except:
                    msg_res = "No ha sido posible enviar el correo de notificación"
                    pass
            else:
                # Caso no controlado
                pass
            return JsonResponse({"ok": 1, "msg": msg_res})
        else:
            msg_res = "Análisis requerido"
            return JsonResponse({"ok": 0, "msg": msg_res})
    except:
        msg_res = "Problemas al procesar la solicitud de derivación"
        return JsonResponse({"ok": 0, "msg": msg_res})


def dashboard_analysis(request):
    exam = request.GET.get("exam")
    year = request.GET.get("year")
    mes = request.GET.getlist("mes")
    query = """
                SELECT YEAR(a.created_at) AS `year`, MONTH(a.created_at) AS `month`, COUNT(a.id) AS count
                FROM backend_sample s
                INNER JOIN backend_analysisform a ON s.entryform_id = a.entryform_id
                INNER JOIN backend_entryform e ON a.entryform_id = e.id
                INNER JOIN workflows_form f ON a.entryform_id = f.object_id
                WHERE f.flow_id in (2,3) AND f.cancelled = 0
                AND YEAR(a.created_at) = {0}
                AND MONTH(a.created_at) IN {1}
            """.format(
        year, tuple(mes)
    )
    if exam != "0":
        query += """
                    AND a.exam_id = %s
                """.format(
            exam
        )
    query += """
                GROUP BY `year`, `month`
                ORDER BY `month`
            """
    cursor1 = connection.cursor()
    data1 = cursor1.execute(query)
    data = cursor1.fetchall()

    return JsonResponse({"data": data})


def dashboard_lefts(request):
    exam = request.GET.get("exam")
    year = request.GET.get("year")
    mes = request.GET.getlist("mes")
    query = """
                SELECT YEAR(e.created_at) AS `year`, MONTH(e.created_at) AS `month`, CONCAT(u.first_name,' ',u.last_name) AS fullName, COUNT(e.id) AS count
                FROM backend_analysisform e
                LEFT JOIN auth_user u ON e.patologo_id = u.id
                INNER JOIN workflows_form f ON f.object_id = e.id
                WHERE f.form_closed = 0 AND f.flow_id in (2,3) AND f.cancelled = 0
                AND YEAR(e.created_at) = {0}
                AND MONTH(e.created_at) IN {1}
            """.format(
        year, tuple(mes)
    )
    if exam != "0":
        query += """
                    AND e.exam_id = {0}
                """.format(
            exam
        )
    query += """
                GROUP BY `year`, `month`, fullName
                ORDER BY `month`
            """
    cursor1 = connection.cursor()
    data1 = cursor1.execute(query)
    data = cursor1.fetchall()

    return JsonResponse({"data": data})


def dashboard_reports(request):
    exam = request.GET.get("exam")
    year = request.GET.get("year")
    mes = request.GET.getlist("mes")

    query = """
                SELECT YEAR(f.closed_at) AS `year`, MONTH(f.closed_at) AS `month`, COUNT(e.id) AS count
                FROM backend_analysisform e
                INNER JOIN workflows_form f ON f.object_id = e.id
                WHERE f.form_closed = 1 AND f.flow_id in (2,3) AND f.cancelled = 0
                AND YEAR(f.closed_at) = {0}
                AND MONTH(f.closed_at) IN {1}
            """.format(
        year, tuple(mes)
    )
    if exam != "0":
        query += """
                    AND e.exam_id = {0}
                """.format(
            exam
        )
    query += """
                GROUP BY `year`, `month`
                ORDER BY `month`
            """
    cursor1 = connection.cursor()
    data1 = cursor1.execute(query)
    data = cursor1.fetchall()

    return JsonResponse({"data": data})


def close_service(request, form_id, closing_date):
    var_post = request.POST.copy()
    form = Form.objects.get(pk=form_id)
    form.form_closed = True
    form.closed_at = datetime.now()
    form.save()
    try:
        form.content_object.manual_closing_date = datetime.strptime(
            closing_date, "%d-%m-%Y"
        )
        form.content_object.report_code = var_post.get("report-code")
        form.content_object.save()
    except Exception as e:
        pass
    return JsonResponse({"ok": True})


def cancel_service(request, form_id):
    var_post = request.POST.copy()
    form = Form.objects.get(pk=form_id)
    form.cancelled = True
    form.cancelled_at = datetime.now()
    form.save()
    try:
        form.content_object.manual_cancelled_date = datetime.strptime(
            var_post.get("date"), "%d-%m-%Y"
        )
        form.content_object.manual_cancelled_by = request.user
        service_comment = ServiceComment.objects.create(
            text="[Comentario de Anulación]: " + var_post.get("comment"),
            done_by=request.user,
        )
        form.content_object.service_comments.add(service_comment)
        form.content_object.researches.clear()
        form.content_object.save()
    except Exception as e:
        pass
    return JsonResponse({"ok": True})


def reopen_form(request, form_id):
    var_post = request.POST.copy()
    form = Form.objects.get(pk=form_id)
    form.cancelled = False
    form.cancelled_at = None
    form.form_reopened = True
    form.form_closed = False
    form.closed_at = None
    form.save()
    try:
        form.content_object.manual_reopened_date = datetime.strptime(
            var_post.get("date"), "%d-%m-%Y"
        )
        form.content_object.manual_reopened_by = request.user
        service_comment = ServiceComment.objects.create(
            text="[Comentario de Reapertura]: " + var_post.get("comment"),
            done_by=request.user,
        )
        form.content_object.service_comments.add(service_comment)
        form.content_object.researches.clear()
        form.content_object.manual_cancelled_date = None
        form.content_object.manual_closing_date = None
        form.content_object.report_code = None
        form.content_object.save()
    except Exception as e:
        pass
    return JsonResponse({"ok": True})


def delete_sample(request, id):
    sample = Sample.objects.get(pk=id)
    ident = sample.identification
    ident.no_fish = ident.no_fish - 1
    ident.save()
    sample.delete()
    changeCaseVersion(True, ident.entryform.id, request.user.id)

    return JsonResponse({"ok": True})


def init_pre_report(request, analysis_id):
    try:
        analysis = AnalysisForm.objects.get(pk=analysis_id)

        if analysis.on_hold or analysis.on_standby:
            analysis.on_hold = None
            analysis.on_standby = None

        analysis.pre_report_started = True
        analysis.pre_report_started_at = datetime.now()
        analysis.save()
        return JsonResponse({"ok": True})
    except Exception as e:
        return JsonResponse({"ok": False, "msg": str(e)})


def end_pre_report(request, analysis_id, end_date):
    try:
        pre_report_ended_at = datetime.strptime(end_date, "%d-%m-%Y %H:%M")
    except ValueError:
        pre_report_ended_at = datetime.now()

    try:
        analysis = AnalysisForm.objects.get(pk=analysis_id)
    except AnalysisForm.DoesNotExists as e:
        return JsonResponse({"ok": False, "msg": str(e)})
    else:
        analysis.pre_report_ended = True
        analysis.pre_report_ended_at = pre_report_ended_at
        analysis.save()

        comment = request.POST.get("comment")

        user_areas = UserArea.objects.filter(user=analysis.patologo)
        areas = Area.objects.filter(
            pk__in=user_areas.values_list("area_id", flat=True))
        leads = UserArea.objects.filter(area__in=areas, role=0)

        recipients = [lead.user.email for lead in list(leads)]
        recipients.extend(
            [
                analysis.patologo.email,
                "carlos.sandoval@vehice.com",
                "cristian.aedo@vehice.com",
                "denis.cardenas@vehice.com",
                "mario.mendoza@vehice.com",
            ]
        )

        subject = f"{analysis} - {analysis.entryform.customer.name}"
        connection = mail.get_connection(
            username=settings.EMAIL_HOST_USER2,
            password=settings.EMAIL_HOST_PASSWORD2,
        )
        from_email = f"Derivación <{settings.EMAIL_HOST_USER2}>"
        context = {
            "msg": (
                f"Informamos preinforme terminado de análisis {analysis.exam.name} "
                f"por el patólogo {analysis.patologo.first_name} {analysis.patologo.last_name}, "
                f"correspondiente al caso {analysis.entryform.no_caso} "
                f"ingresado el {analysis.created_at}, su fecha de cierre es "
                f"{analysis.pre_report_ended_at}."
                f"Adjunta este comentario: "
                f"{comment}"
            ),
        }
        template = "app/template_assignment.html"
        message = get_template(template).render(context=context)
        email = EmailMultiAlternatives(
            subject,
            message,
            from_email,
            recipients,
            connection=connection,
        )
        email.content_subtype = "html"

        try:
            email.send()
        except (BadHeaderError, SMTPException):
            return JsonResponse({"ok": False})

        return JsonResponse({"ok": True})


def save_scores(request, type, id):
    var_post = request.POST.copy()
    try:
        if type == "analysis":
            form = AnalysisForm.objects.get(pk=id)
            if var_post.get("score_diagnostic") != None:
                form.score_diagnostic = var_post.get("score_diagnostic", None)
            if var_post.get("score_report") != None:
                form.score_report = var_post.get("score_report", None)
            form.save()
        if type == "group":
            analysisgroups = AnalysisGrouper.objects.filter(grouper=id)
            for analysisgroup in analysisgroups:
                if var_post.get("score_diagnostic") != None:
                    analysisgroup.analysis.score_diagnostic = var_post.get(
                        "score_diagnostic", None)
                if var_post.get("score_report") != None:
                    analysisgroup.analysis.score_report = var_post.get(
                        "score_report", None)
                analysisgroup.analysis.save()

        return JsonResponse(
            {
                "ok": True,
                "score_diagnostic": form.score_diagnostic,
                "score_report": form.score_report,
            }
        )
    except Exception as e:
        return JsonResponse({"ok": False})


def get_scores(request, type, id):
    try:
        if type == "analysis":
            form = AnalysisForm.objects.get(pk=id)
        if type == "group":
            form = AnalysisGrouper.objects.filter(grouper=id).first().analysis
        return JsonResponse(
            {
                "ok": True,
                "score_diagnostic": form.score_diagnostic,
                "score_report": form.score_report,
            }
        )
    except Exception as e:
        return JsonResponse({"ok": False})


def get_research_metadata(request, id):
    try:
        r = Research.objects.get(pk=id)
        r_json = model_to_dict(r)
        r_json["init_date"] = r_json["init_date"].strftime("%d/%m/%Y %H:%M")
        r_json["clients"] = [client.id for client in r_json["clients"]]

        r_json["client_services"] = {}
        for serv in r_json["services"]:
            if serv.entryform.customer_id in r_json["client_services"]:
                r_json["client_services"][serv.entryform.customer_id].append(
                    serv.id)
            else:
                r_json["client_services"][serv.entryform.customer_id] = [serv.id]

        r_json["services"] = [serv.id for serv in r_json["services"]]
        r_json["status"] = 1 if r_json["status"] else 0

        return JsonResponse({"ok": True, "research": r_json})
    except Exception as e:
        print(e)
        return JsonResponse({"ok": False})


def force_form_to_step(request, form, step):
    try:
        form = Form.objects.get(pk=form)

        if form.reception_finished and int(step) in (2, 3):
            form.reception_finished = False
            form.reception_finished_at = None
        form.state_id = step
        form.save()

        return JsonResponse({"ok": True})
    except:
        return JsonResponse({"ok": False})


def fix_missing_units(request):

    cont = 0
    cont_to_procces = 0

    for ident in Identification.objects.filter(entryform_id__lte=2034).order_by(
        "-entryform"
    ):
        samples = Sample.objects.filter(identification=ident).order_by("index")
        units = Unit.objects.filter(identification=ident)

        if units.count() == 0:
            unit_index = 1
            for sample in samples:
                sample_exams = SampleExams.objects.filter(sample=sample)
                unit = Unit.objects.create(
                    correlative=unit_index, identification=ident)
                unit_index += 1

                unit_organs_id = []
                unit_organs = []
                for se in sample_exams:
                    Unit_Organ = OrganUnit.objects.filter(
                        unit=unit, organ=se.organ
                    ).first()

                    if not Unit_Organ:
                        Unit_Organ = OrganUnit.objects.create(
                            unit=unit, organ=se.organ)
                    if Unit_Organ.id not in unit_organs_id:
                        unit_organs_id.append(Unit_Organ.id)
                        unit_organs.append(Unit_Organ)

                    se.unit_organ = Unit_Organ
                    se.save()

                for uo in unit_organs:
                    sample.unit_organs.add(uo)
                sample.save()

            cont_to_procces += 1

        ident.quantity = Unit.objects.filter(identification=ident).count()
        ident.save()
        cont += 1

    result = {
        "Identificaciones Revisadas": cont,
        "Identificaciones Modificadas (sin unidades)": cont_to_procces,
    }

    return JsonResponse(
        {
            "ok": True,
            "response": result,
            "mensaje": "Se han creado las unidades y órganos faltantes en base a los individuos y servicios previamente definidos de manera exitosa.",
        }
    )


def centers_list(request):
    centers = Center.objects.all()

    datalist = [center.name for center in centers]

    return JsonResponse(datalist, safe=False)


def toggle_analysis_status(request, pk):
    analysis = get_object_or_404(AnalysisForm, pk=pk)

    form_data = json.loads(request.body)

    if form_data["is_hold"]:
        if analysis.on_hold:
            analysis.on_hold = None
        else:
            motive = form_data["motive"]
            analysis.on_hold = datetime.now()

            service_comment = ServiceComment.objects.create(
                text=f"[EN ESPERA]: {motive}",
                done_by=request.user,
            )
            analysis.service_comments.add(service_comment)
    else:
        if analysis.on_standby:
            analysis.on_standby = None
        else:
            motive = form_data["motive"]
            analysis.on_standby = datetime.now()

            service_comment = ServiceComment.objects.create(
                text=f"[PAUSADO]: {motive}",
                done_by=request.user,
            )
            analysis.service_comments.add(service_comment)

    analysis.save()

    return JsonResponse({"status": "OK"})


# Get analysis deadlines
def get_serviceDeadline(request, id):
    try:
        analysis = AnalysisForm.objects.get(id=id)
        analysisTimes = AnalysisTimes.objects.filter(analysis=analysis)
        data = {}

        if analysisTimes.exists():
            if AnalysisTimes.objects.filter(analysis=analysis, type_deadline=1).last() != None:
                laboratoryDeadline = AnalysisTimes.objects.filter(
                    analysis=analysis, type_deadline=1).last().deadline.__format__('%d-%m-%Y')
            else:
                laboratoryDeadline = analysis.exam.laboratory_deadline

            if AnalysisTimes.objects.filter(analysis=analysis, type_deadline=2).exists():
                pathologistDeadline = AnalysisTimes.objects.filter(
                    analysis=analysis, type_deadline=2).last().deadline.__format__('%d-%m-%Y')
            else:
                pathologistDeadline = analysis.exam.pathologist_deadline

            if AnalysisTimes.objects.filter(analysis=analysis, type_deadline=3).exists():
                reviewDeadline = AnalysisTimes.objects.filter(
                    analysis=analysis, type_deadline=3).last().deadline.__format__('%d-%m-%Y')
            else:
                reviewDeadline = analysis.exam.review_deadline
            exists = True
            analysisTimes_comment = AnalysisTimes.objects.filter(
                analysis=analysis).last().service_comments
            if analysisTimes_comment == None:
                comment = ""
            else:
                comment = analysisTimes_comment.text
        else:
            laboratoryDeadline = analysis.exam.laboratory_deadline
            pathologistDeadline = analysis.exam.pathologist_deadline
            reviewDeadline = analysis.exam.review_deadline
            exists = False
            comment = ""

        data["laboratoryDeadline"] = laboratoryDeadline
        data["pathologistDeadline"] = pathologistDeadline
        data["reviewDeadline"] = reviewDeadline

        return JsonResponse(
            {
                "ok": True,
                "data": data,
                "created_at": analysis.created_at.date(),
                "exists": exists,
                "comment": comment
            }
        )
    except Exception as e:
        return JsonResponse({"ok": False})


# Save analysis deadlines
def save_serviceDeadline(request, id):
    var_post = request.POST.copy()
    try:
        analysis = AnalysisForm.objects.get(id=id)
        user = request.user
        comment_text = var_post["comment"]

        if comment_text != "":
            comment = ServiceComment.objects.create(
                text=comment_text, done_by=user, created_at=datetime.now())
        else:
            comment = None

        for value in var_post:
            if value != "comment":
                changeDeadline = False
                str_date = str(var_post.getlist(value)[0]).replace('/', '-')
                finish_date = datetime.strptime(str_date, "%d-%m-%Y").date()

                if value == "laboratoryDeadline":
                    start_date = analysis.created_at.date()
                    standar = analysis.exam.laboratory_deadline
                if value == "pathologistDeadline":
                    str_date = str(var_post.getlist(
                        "laboratoryDeadline")[0]).replace('/', '-')
                    start_date = datetime.strptime(str_date, "%d-%m-%Y").date()
                    standar = analysis.exam.pathologist_deadline
                if value == "reviewDeadline":
                    str_date = str(var_post.getlist(
                        "pathologistDeadline")[0]).replace('/', '-')
                    start_date = datetime.strptime(str_date, "%d-%m-%Y").date()
                    standar = analysis.exam.review_deadline

                count_days = 0
                while start_date < finish_date:
                    if start_date.weekday() < 5:
                        count_days = count_days+1
                    start_date = start_date+timedelta(1)

                if count_days > standar or count_days < standar:
                    changeDeadline = True

                deadline_type = var_post.getlist(value)[1]
                deadline = AnalysisTimes.objects.create(analysis=analysis, exam=analysis.exam, deadline=finish_date,
                                                        changeDeadline=changeDeadline, type_deadline_id=deadline_type, created_by=user, service_comments=comment)
                deadline.save()

        return JsonResponse(
            {
                "ok": True,
            }
        )
    except Exception as e:
        print(e)
        return JsonResponse({"ok": False})


class ConsolidadosBase(View):

    @method_decorator(login_required)
    def get(self, request, form_id):
        analysisform = AnalysisForm.objects.get(id=form_id)
        if analysisform.exam.subclass == "HE":
            context,route = getConsolidadoHe(form_id)
        elif analysisform.exam.name == "SCORE_GILL":
            context, route = consolidadoScoreGill(form_id)
        return render(request, route, context)
    


def getConsolidadoHe(form_id):

        organos = []
        samples = []
        sampleResults = []
        context = {
            "samples": [],
            "sampleExams": [],
            "diagnosticos": [],
            "results": [],
            "sampleResults": [],
        }

        analysis = AnalysisForm.objects.get(id=form_id)
        sampleExams = SampleExams.objects.filter(
            sample__entryform=analysis.entryform, exam=analysis.exam, stain=analysis.stain)
        sampleExamResults = SampleExamResult.objects.filter(analysis=analysis)

        for sampleExamResult in sampleExamResults:
            if sampleExamResult.sample_exam == None:
                AnalysisSampleExmanResult.objects.filter(sample_exam_result=sampleExamResult).delete()
                sampleExamResult.delete()

        sampleExamResults = SampleExamResult.objects.filter(analysis=analysis)
        context["sampleResults"] = serialize(
            'json', sampleExamResults, use_natural_foreign_keys=True, use_natural_primary_keys=True)

        for sampleExamResult in sampleExamResults:
            sampleResults.append(sampleExamResult.result_organ.id)
        sampleResults = list(set(sampleResults))

        context["results"] = sampleResults
        context["sampleExams"] = serialize(
            'json', sampleExams, use_natural_foreign_keys=True, use_natural_primary_keys=True)

        for sampleExam in sampleExams:
            organos.append(sampleExam.organ)
            sample = Sample.objects.get(id=sampleExam.sample.id)
            if sample not in samples:
                samples.append(sample)

        samples = sorted(samples, key=lambda x: x.index)
        context["samples"] = serialize(
            'json', samples, use_natural_foreign_keys=True, use_natural_primary_keys=True)
        organos = list(set(organos))

        for organo in organos:
            if organo.id == 49 or organo.id == 72:
                results = ResultOrgan.objects.all().exclude(organ__name__contains='-')
            else:
                results = ResultOrgan.objects.filter(organ__in=organos)

        for result in results:
            context["diagnosticos"].append({
                "id": result.id,
                "resultado": result.result,
                "organo": result.organ.name
            }) 
        route = "app/consolidados/consolidado_HE/consolidado_he.html"
        return context, route

def saveConsolidadoHe(request, form_id):

        analysis = AnalysisForm.objects.get(id=form_id)
        request = request.POST
        distribution = 0

        try:
            for key, value in request.items():
                keys = key[5:-1].split("%")

                if keys[0] == "distribution":
                    distribution = value
                else:
                    try:
                        sampleExam = SampleExams.objects.get(
                            sample__entryform=analysis.entryform, exam=analysis.exam, stain=analysis.stain, sample__index=keys[2], organ__name=keys[0])
                    except:
                        sampleExam = None
                    if not sampleExam:
                        sampleExam = SampleExams.objects.get(
                            sample__entryform=analysis.entryform, exam=analysis.exam, stain=analysis.stain, sample__index=keys[2])
                    sampleExamResult, created = SampleExamResult.objects.update_or_create(
                        sample_exam=sampleExam, result_organ_id=keys[1], defaults={'distribution': distribution, 'value': value})
                    analysisSampleExmanResult = AnalysisSampleExmanResult.objects.update_or_create(
                        analysis=analysis, sample_exam_result=sampleExamResult, defaults={'created_at': datetime.now()})

            return JsonResponse({'ok': True})
        except Exception as e:
            print(e)
            return JsonResponse({"ok": False, "error":e.__str__()})

def deleteDiagnosticConsolidadoHe(request, form_id):

        delete = QueryDict(request.body)
        organ = delete.get('organ')
        diagnostic = delete.get('diagnostic')

        sampleExamResults = SampleExamResult.objects.filter(
            analysis=form_id, result_organ_id=diagnostic)
        for sampleExamResult in sampleExamResults:
            AnalysisSampleExmanResult.objects.get(
                analysis_id=form_id, sample_exam_result=sampleExamResult).delete()
            sampleExamResult.delete()

        return JsonResponse({'ok': True})




# export excel consolidado
def export_consolidado(request, id):

    samples = []
    diagnostic = []
    headers = ["Órgano", "Diagnóstico", "Distribución"]

    analysis = AnalysisForm.objects.get(id=id)
    sampleExsamResults = SampleExamResult.objects.filter(analysis=analysis)
    sampleExams = SampleExams.objects.filter(
        sample__entryform=analysis.entryform, exam=analysis.exam, stain=analysis.stain)

    date = datetime.now().date().strftime("%d-%m-%Y")

    try:
        name_file = f'Consolidados_{analysis.entryform.no_caso}_{analysis.exam.name}_{date}.xlsx'
        output = io.BytesIO()
        workbook = xlsxwriter.Workbook(output, {'in_memory': True})
        worksheet = workbook.add_worksheet("Hoja 1")

        for sampleExam in sampleExams:
            sample = Sample.objects.get(id=sampleExam.sample.id)
            if sample not in samples:
                samples.append(sample)

        samples = sorted(samples, key=lambda x: x.index)

        for sample in samples:
            headers.append(sample.index)

        for col_num, header_title in enumerate(headers):
            worksheet.write(1, col_num+1, header_title)

        row_num = 2
        for sampleExsamResult in sampleExsamResults:
            if sampleExsamResult.result_organ.id not in diagnostic:
                worksheet.write(
                    row_num, 1, sampleExsamResult.result_organ.organ.name)
                worksheet.write(
                    row_num, 2, sampleExsamResult.result_organ.result.name)
                worksheet.write(row_num, 3, sampleExsamResult.distribution)
                diagnostic.append(sampleExsamResult.result_organ.id)
                row_num += 1

        diagnostic = []
        row_num = 1
        index = 0
        for sampleExsamResult in sampleExsamResults:
            col_num = 1
            if sampleExsamResult.result_organ.id not in diagnostic:
                diagnostic.append(sampleExsamResult.result_organ.id)
                row_num += 1

            index = headers.index(sampleExsamResult.sample_exam.sample.index)

            col_num += index
            worksheet.write(row_num, col_num, sampleExsamResult.value)

        workbook.close()
        output.seek(0)

        response = HttpResponse(output.read(
        ), content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = 'attachment; filename='+name_file
        output.close()

        return response

    except Exception as e:
        print(e)
        return JsonResponse({"ok": False})


def analysis_report(request, id):
    analysis = Analysis.objects.get(id=id)

    try:
        report = AnalysisReport.objects.get(analysis=analysis)
        date = report.report_date.strftime('%d/%m/%Y') if report.report_date != None else ""

        methodology = "Sin metodología"
        if report.methodology != None:
            methodology = report.methodology.name

        data = {
            "report_date": date,
            "anamnesis": report.anamnesis,
            "comment": report.comment,
            "etiological_diagnostic": report.etiological_diagnostic,
            "images": [],
            "methodology":methodology,
            "correlative":report.correlative
        }

        images = ReportImages.objects.filter(
            analysis_report=report).order_by("index")

        for image in images:
            data["images"].append({
                "id": image.id,
                "image_name": image.imagen.name,
                "index": image.index,
                "size": image.size,
                "comment": image.comment,
            })

        return JsonResponse(data)

    except ObjectDoesNotExist as e:
        report = AnalysisReport.objects.create(analysis=analysis, correlative=1)

        return JsonResponse({'ok': True})


def analysisReport_addImage(request, id):
    request = request.POST
    index = request["index"]

    report = AnalysisReport.objects.get(analysis_id=id)
    image = ReportImages.objects.create(analysis_report=report, index=index)

    return JsonResponse({'id': image.id})


def analysisReport_deleteImage(request, id):

    data = QueryDict(request.body)
    new_order_data = data.getlist('new_order[]')

    ReportImages.objects.get(id=id).delete()
    new_order(new_order_data)

    return JsonResponse({'ok': True})


def analysisReport_save(request, id):
    request_files = request.FILES
    request_data = request.POST

    if "new_order[]" in request_data:
        new_order_data = request_data.getlist('new_order[]')
        new_order(new_order_data)
    else:
        report = AnalysisReport.objects.get(analysis_id=id)

        if "methodology" in request_data:
            if request_data["methodology"] != "" and request_data["methodology"] != "Sin metodología":
                methodology = Methodology.objects.get(id=int(request_data["methodology"]))
                report.methodology = methodology
                report.save()
                return JsonResponse({'name': methodology.name})
            else:
                report.methodology = None
                report.save()
                return JsonResponse({'name': "Sin metodología"})

        report.report_date = datetime.strptime(
            request_data["report_date"], '%d/%m/%Y').date()
        report.anamnesis = request_data["anamnesis"]
        report.comment = request_data["comment"]
        report.correlative = int(request_data["correlative"])
        report.etiological_diagnostic = request_data["etiological_diagnostic"]
        report.save()

        for key in islice(request_data, 7, None):
            data = request_data[key]
            key = key.split("-")

            image = ReportImages.objects.get(id=key[1])
            if key[0] == "size":
                image.size = data
                image.save()

            if key[0] == "comment":
                image.comment = data
                image.save()

        for key, file in request_files.items():
            key = key.split("-")
            image = ReportImages.objects.get(id=key[1])
            image.imagen = file
            image.save()

    return JsonResponse({'ok': True})


def createMethodology(request):

    data = request.POST
    analysis_id = data.get("analysis_id")
    analysis = Analysis.objects.get(id=analysis_id)

    methodology = Methodology.objects.create(exam=analysis.exam)

    return JsonResponse({'id': methodology.id})

def saveMethodology(request,id):

    request_files = request.FILES
    request_data = request.POST

    if "new_order[]" in request_data:
        new_order_data = request_data.getlist('new_order[]')
        new_order_methodologyImages(new_order_data)
    else:
        methodology = Methodology.objects.get(id=id)
        methodology.name = request_data[f'methodologyName-{id}']
        methodology.description = request_data[f'methodologyText-{id}']
        methodology.save()

        for key in islice(request_data, 2, None):
            data = request_data[key]
            key = key.split("-")

            image = MethodologyImage.objects.get(id=key[1])
            if key[0] == "sizeMethodologyImage":
                image.size = data
                image.save()

            if key[0] == "commentImageMethodology":
                image.comment = data
                image.save()

        for key, file in request_files.items():
            key = key.split("-")
            image = MethodologyImage.objects.get(id=key[1])
            image.imagen = file
            image.save()

        return JsonResponse({"ok":True,'name': methodology.name})

    return JsonResponse({'ok': True})

def deleteMethodology(request,id):

    Methodology.objects.get(id=id).delete()

    return JsonResponse({'ok': True})

def createMethodologyImage(request,id):

    request = request.POST
    index = request["index"]

    methodology = Methodology.objects.get(id=id)
    image = MethodologyImage.objects.create(methodology=methodology, index=index)

    return JsonResponse({'id': image.id})

def methodology_deleteImage(request, id):

    data = QueryDict(request.body)
    new_order_data = data.getlist('new_order[]')

    MethodologyImage.objects.get(id=id).delete()
    new_order_methodologyImages(new_order_data)

    return JsonResponse({'ok': True})

def ExamMethodologys(request,id):

    exam = Analysis.objects.get(id=id).exam

    methodologys = exam.methodology_set.all()

    data = []

    for methodology in methodologys:
        methodology_data = {
            "id":methodology.id,
            "name":methodology.name,
            "description":methodology.description,
            "images":[]
        }

        for image in MethodologyImage.objects.filter(methodology=methodology).order_by("index"):
            image_data = {
                "id":image.id,
                "index":image.index,
                "size":image.size,
                "comment":image.comment,
                "name":image.imagen.name
            }
            methodology_data["images"].append(image_data)

        data.append(methodology_data)


    return JsonResponse({'data': data})

def new_order_methodologyImages(new_order):
    index = 0
    for image_order in new_order:
        index += 1
        image = MethodologyImage.objects.get(id=image_order)
        image.index = index
        image.save()

def new_order(new_order):
    index = 0
    for image_order in new_order:
        index += 1
        image = ReportImages.objects.get(id=image_order)
        image.index = index
        image.save()


def template_consolidados_HE(request, id):
    analysis = Analysis.objects.get(id=id)

    analysisSampleExmanResults = AnalysisSampleExmanResult.objects.filter(analysis_id=id)
    analysisSampleExmanResults = sorted(analysisSampleExmanResults, key=lambda x: x.sample_exam_result.result_organ.organ.name)

    analysis_report = AnalysisReport.objects.get(analysis_id=id)

    if analysis.research_set.all():
        research = True
    else:
        research = False

    no_caso = analysis.entryform.no_caso
    exam = analysis.exam.abbreviation
    no_reporte_date = analysis_report.report_date.strftime('%d%m%y')
    correlative = "{:02d}".format(analysis_report.correlative)

    no_reporte = f'{no_caso}_{exam}{correlative}_{no_reporte_date}'

    identifications = Identification.objects.filter(entryform__no_caso=no_caso)

    identifications_group_empty = True
    for identification in identifications:
        if identification.group != "":
            identifications_group_empty = False

    samples = Sample.objects.filter(
        entryform=analysis.entryform
    ).values_list("id", flat=True)
    sampleExams = SampleExams.objects.filter(
          sample__in=samples, exam=analysis.exam, stain=analysis.stain
          )
    organs_count = samples_count = len(sampleExams)
    if analysis.exam.pricing_unit == 1:
            samples_count = organs_count
    else:
        sampleExams = SampleExams.objects.filter(
            sample__in=samples, exam=analysis.exam, stain=analysis.stain
        ).values_list("sample_id", flat=True)
        samples_count = len(list(set(sampleExams)))

    sampleExams = SampleExams.objects.filter(sample__in=samples, exam=analysis.exam, stain=analysis.stain)
    samples=[]
    identifications_filter = []
    for sampleExam in sampleExams:
        sample = Sample.objects.get(id=sampleExam.sample.id)

        identification = identifications.filter(id=sample.identification.id)[0]
        if identification not in identifications_filter and not any(iden.cage == identification.cage and iden.weight == identification.weight for iden in identifications_filter):
            identifications_filter.append(identification)

        if sample not in samples:
            samples.append(sample)

    samples = sorted(samples, key=lambda x: x.index)

    sample_charge = analysis.samples_charged if analysis.samples_charged != None and analysis.samples_charged > 0 else  samples_count

    reportImages = analysis_report.reportimages_set.all().order_by('index')

    pathologist = ""
    if analysis.patologo:
        pathologist = f"{analysis.patologo.first_name} {analysis.patologo.last_name}"

    if analysis_report.methodology != None:

        methodology = {
            "id":analysis_report.methodology.id,
            "name":analysis_report.methodology.name,
            "description":analysis_report.methodology.description,
            "image":[],
        }

        for image in MethodologyImage.objects.filter(methodology=analysis_report.methodology).order_by("index"):
            methodology_image = {
                "id":image.id,
                "comment":image.comment,
                "size":image.size,
                "url":image.imagen.url
            }
            methodology["image"].append(methodology_image)
    else:
        methodology = ""

    context = {
        "no_caso": no_caso,
        "no_reporte": no_reporte,
        "research": research,
        "pathologist": pathologist,
        "customer": analysis.entryform.customer.name,
        "center": analysis.entryform.center,
        "specie": analysis.entryform.specie.name,
        "larvalstage": analysis.entryform.larvalstage.name,
        "watersource": analysis.entryform.watersource.name,
        "identifications": identifications_filter,
        "identifications_group_empty":identifications_group_empty,
        "fecha_recepcion": analysis.created_at.strftime('%d-%m-%Y'),
        "fecha_informe": analysis_report.report_date.strftime('%d-%m-%Y'),
        "fecha_muestreo": analysis.entryform.sampled_at.strftime('%d-%m-%Y') if analysis.entryform.sampled_at != None else "-",
        "sample_charge": f'{sample_charge} {analysis.exam.name}',
        "anamnesis": analysis_report.anamnesis,
        "comment": analysis_report.comment,
        "etiological_diagnostic": analysis_report.etiological_diagnostic,
        "samples":samples,
        "reportImages": reportImages,
        "methodology":methodology,
    }

    return render(request, "app/consolidados/consolidado_HE/template_consolidado_HE.html", context)

def template_consolidados_HE_diagnostic(request, id):
    analysis = Analysis.objects.get(id=id)
    identifications_filter = []

    analysisSampleExmanResults = AnalysisSampleExmanResult.objects.filter(analysis_id=id)
    analysisSampleExmanResults = sorted(analysisSampleExmanResults, key=lambda x: x.sample_exam_result.result_organ.organ.name)

    identifications = Identification.objects.filter(entryform=analysis.entryform)

    samples = Sample.objects.filter(
        entryform=analysis.entryform
    ).values_list("id", flat=True)
    sampleExams = SampleExams.objects.filter(
          sample__in=samples, exam=analysis.exam, stain=analysis.stain
          )

    samples=[]
    for sampleExam in sampleExams:
            sample = Sample.objects.get(id=sampleExam.sample.id)
            identification = identifications.filter(id=sample.identification.id)[0]
            if identification not in identifications_filter:
                identifications_filter.append(identification)

            if sample not in samples:
                samples.append(sample)

    samples = sorted(samples, key=lambda x: x.index)

    context = {
        "calspan_identifications": len(samples),
        "identifications":[],
        "samples":samples,
        "diagnostics":[],
    }

    for identification in identifications_filter:
        colspan = len(identification.sample_set.all())

        samplesExams_identification = sampleExams.filter(sample__identification=identification)

        sample_count =[]
        for sampleExam in samplesExams_identification:
            sample_identification = Sample.objects.get(id=sampleExam.sample.id)
            if sample_identification not in sample_count:
                sample_count.append(sample_identification)

        sample_count = sorted(sample_count, key=lambda x: x.index)
        colspan = len(sample_count)

        context["identifications"].append({
            "cage":identification.cage,
            "colspan": colspan,
        })

    diagnostic=[]
    index=0
    samples_afected = 0
    total_samples = 0
    organ=[]
    organ_rowspan=1
    for analysisSampleExmanResult in analysisSampleExmanResults:
        if analysisSampleExmanResult.sample_exam_result.result_organ not in diagnostic:
            samples_afected = 0
            total_samples = 0
            if analysisSampleExmanResult.sample_exam_result.value > 0:
                samples_afected += 1

            index+=1
            diagnostic.append(analysisSampleExmanResult.sample_exam_result.result_organ)
            context["diagnostics"].append({
                "organ":analysisSampleExmanResult.sample_exam_result.result_organ.organ.name,
                "diagnostic": analysisSampleExmanResult.sample_exam_result.result_organ.result.name,
                "distribution": analysisSampleExmanResult.sample_exam_result.distribution,
                "results":{analysisSampleExmanResult.sample_exam_result.sample_exam.sample.index:analysisSampleExmanResult.sample_exam_result.value},
                "samples_afected": samples_afected,
            })

        else:
            if analysisSampleExmanResult.sample_exam_result.value > 0:
                samples_afected += 1

            context["diagnostics"][index-1]["results"][analysisSampleExmanResult.sample_exam_result.sample_exam.sample.index] = analysisSampleExmanResult.sample_exam_result.value
            context["diagnostics"][index-1]["samples_afected"] = samples_afected

        if analysisSampleExmanResult.sample_exam_result.value >= 0:
            total_samples += 1
            context["diagnostics"][index-1]["total_samples"] = total_samples

        if total_samples == 0:
            samples_afected_percentage = 0
        else:
            samples_afected_percentage = round((samples_afected*100)/total_samples)

        context["diagnostics"][index-1]["samples_afected_percentage"]=samples_afected_percentage

    organ = ""
    diagnostics=[]
    diagnostics_final=[]
    for i in range(len(context["diagnostics"])):
        if context["diagnostics"][i]["organ"] != organ:
            organ=context["diagnostics"][i]["organ"]
            diagnostics=[]
            diagnostics.append(context["diagnostics"][i])

            try:
                if context["diagnostics"][i+1]["organ"] != organ:
                    diagnostics_final.append(diagnostics[0])

            except IndexError:
                diagnostics_final.append(diagnostics[0])
        else:
            diagnostics.append(context["diagnostics"][i])

            try:
                if context["diagnostics"][i+1]["organ"] != organ:
                    diagnostics.sort(key=lambda e: e["samples_afected_percentage"],reverse=True)
                    for diagnostic in diagnostics:
                        diagnostics_final.append(diagnostic)

            except IndexError:
                diagnostics.sort(key=lambda e: e["samples_afected_percentage"],reverse=True)
                for diagnostic in diagnostics:
                    diagnostics_final.append(diagnostic)

    context["diagnostics"] = diagnostics_final

    organ = ""
    organ_rowspan=0
    for i in range(len(context["diagnostics"])):
        if context["diagnostics"][i]["organ"] != organ:
            organ=context["diagnostics"][i]["organ"]
            organ_rowspan=1

            try:
                if context["diagnostics"][i+1]["organ"] != organ:
                    context["diagnostics"][i-organ_rowspan+1]["organ_rowspan"] = organ_rowspan

            except IndexError:
                context["diagnostics"][i-organ_rowspan+1]["organ_rowspan"] = organ_rowspan

        else:
            organ_rowspan += 1

            try:
                if context["diagnostics"][i+1]["organ"] != organ:
                    context["diagnostics"][i-organ_rowspan+1]["organ_rowspan"] = organ_rowspan

            except IndexError:
                context["diagnostics"][i-organ_rowspan+1]["organ_rowspan"] = organ_rowspan

    for sample in samples:
        for diagnostics in context["diagnostics"]:
            if sample.index not in diagnostics["results"]:
                diagnostics["results"][sample.index] = -1

    for diagnostics in context["diagnostics"]:
        llaves_ordenadas = sorted(diagnostics["results"].keys())
        diagnostics["results"] = {k: diagnostics["results"][k] for k in llaves_ordenadas}

    return render(request, "app/consolidados/consolidado_HE/diagnostic_page.html", context)


def template_consolidados_HE_contraportada(request, id):
    analysis = Analysis.objects.get(id=id)
    contraportada = "/static/assets/images/contraportada.jpg"
    #if analysis.exam.id == 66:
    #    contraportada = "/static/assets/images/contraportada_HE Alevin.jpg"
    #else:
    #    contraportada = "/static/assets/images/contraportada_HE Vertebra.jpg"

    if analysis.exam.id == 67:
        contraportada = "/static/assets/images/contraportada.jpg"
    elif analysis.exam.id == 66:
        contraportada = "/static/assets/images/contraportada_HE Alevin.jpg"
    elif analysis.exam.id == 156:
        contraportada = "/static/assets/images/contraportada_HE Vertebra.jpg"
    elif analysis.exam.id == 74:
        contraportada = "/static/assets/images/contraportada_score_gill.jpg"
        
    context= {
        "contraportada":contraportada,
    }

    return render(request, "app/consolidados/contraportada.html",context)

@never_cache
def download_consolidados_HE(request, id):
    """Downloads a PDF file for a :model:`backend.Preinvoice` resume"""
    analysis = Analysis.objects.get(id=id)
    report = AnalysisReport.objects.get(analysis_id=id)
    no_caso = analysis.entryform.no_caso
    exam = analysis.exam.abbreviation
    date = report.report_date.strftime('%d%m%y') if report.report_date != None else " "
    correlative= "{:02d}".format(report.correlative)

    options = {
        "quiet": "",
        "page-size": "letter",
        "encoding": "UTF-8",
        "margin-top": "25mm",
        "margin-left": "5mm",
        "margin-right": "5mm",
        "margin-bottom": "20mm",
        "header-html": "https://storage.googleapis.com/vehice-media/header_HE.html",
        "header-spacing": 7,
        "header-font-size": 8,
        "footer-html": "https://storage.googleapis.com/vehice-media/footer_HE.html",
        "footer-spacing": 5,
    }

    url = reverse("template_consolidados_HE", kwargs={"id": id})
    pdf_vertical = pdfkit.from_url(settings.SITE_URL + url, False, options=options)

    options["orientation"] = "Landscape"
    url = reverse("template_consolidados_HE_diagnostic", kwargs={"id": id})
    pdf_horizontal = pdfkit.from_url(settings.SITE_URL + url, False, options=options)

    options = {
        "quiet": "",
        "page-size": "letter",
        "encoding": "UTF-8",
        "margin-top": "0mm",
        "margin-left": "0mm",
        "margin-right": "0mm",
        "margin-bottom": "0mm",
    }

    url = reverse("template_consolidados_HE_contraportada", kwargs={"id": id})
    pdf_contraportada = pdfkit.from_url(settings.SITE_URL + url, False, options=options)

    pdf_vertical = io.BytesIO(pdf_vertical)
    pdf_horizontal = io.BytesIO(pdf_horizontal)
    pdf_contraportada = io.BytesIO(pdf_contraportada)

    pdf_vertical_reader = PdfReader(pdf_vertical)
    pdf_horizontal_reader = PdfReader(pdf_horizontal)
    pdf_contraportada_reader = PdfReader(pdf_contraportada)
    pdf_combinado_writer = PdfWriter()

    index_vertical = 0
    pagina_vertical = pdf_vertical_reader.pages
    pdf_combinado_writer.add_page(pagina_vertical[index_vertical])

    if report.methodology != None:
        index_vertical += 1
        pdf_combinado_writer.add_page(pagina_vertical[index_vertical])

    for page in pdf_horizontal_reader.pages:
        pagina_horizontal = page
        pdf_combinado_writer.add_page(pagina_horizontal)

    index_vertical += 1
    for page in pdf_vertical_reader.pages[index_vertical:]:
        pdf_combinado_writer.add_page(page)

    pdf_combinado_writer.add_page(pdf_contraportada_reader.pages[0])

    pdf_combinado = io.BytesIO()

    pdf_combinado_writer.write(pdf_combinado)

    datos_pdf_combinado = pdf_combinado.getvalue()

    pdf_vertical.close()
    pdf_horizontal.close()
    pdf_combinado.close()

    response = HttpResponse(content_type="application/pdf")
    response["Content-Disposition"] = "inline;filename=" + f"{no_caso}_{exam}{correlative}_{date}.pdf"
    response.write(datos_pdf_combinado)

    return response

def consolidadoScoreGill(form_id):

    context = {
        "samples": [],
        "identifications": [],
        "Entryform":'',
    }

    analysis = AnalysisForm.objects.get(id=form_id)
    samples = list(Sample.objects.filter(entryform__id=analysis.entryform.id).order_by("index"))
    list_empty = dict()
    entryForm = EntryForm.objects.get(id=analysis.entryform.id)
    results= Result.objects.filter(type_result__id__in=[3,4,5,6,7])
    
    for result in results:
        context[result.name] =  result.id

    for sample in range(len(samples)):
        try:
            if samples[sample].identification.id != samples[sample+1].identification.id:
                list_empty[f"sample_{samples[sample].id}"] = {
                    "id": samples[sample].id,
                    "index": samples[sample].index,
                    "identification": {
                            "id": samples[sample].identification.id,
                            "cage": samples[sample].identification.cage,
                        }
                }
                
                prom={
                    "identification": {
                            "id": samples[sample].identification.id,
                            "cage": samples[sample].identification.cage,
                        }
                }
                list_empty[f"promedio_identification_{samples[sample].identification.id}"] = prom
            else:
                list_empty[f"sample_{samples[sample].id}"] = {
                    "id": samples[sample].id,
                    "index": samples[sample].index,
                    "identification": {
                            "id": samples[sample].identification.id,
                            "cage": samples[sample].identification.cage,
                        }
                }
        except:
            list_empty[f"sample_{samples[sample].id}"] = {
                    "id": samples[sample].id,
                    "index": samples[sample].index,
                    "identification": {
                            "id": samples[sample].identification.id,
                            "cage": samples[sample].identification.cage,
                        }
                }
            list_empty[f"promedio_identification_{samples[sample].identification.id}"] = {
                "identification":{
                    "id": samples[sample].identification.id,
                    "cage": samples[sample].identification.cage,
                        },
            }
            list_empty[f"promedio_center"] = {
                "center":samples[sample].entryform.center,
                }
            list_empty["porcentaje"] = []  
        
    identifications = Identification.objects.filter(entryform__id=analysis.entryform.id)
    # Pasar identificaciones a dict con un for
    identifications_list = []
    for identification in identifications:
        identifications_dict = {
            "id": identification.id,
            "cage": identification.cage,
        }
        identifications_list.append(identifications_dict)
    

    sampleexamresultempty = []

    sampleexamresults = SampleExamResult.objects.filter(analysis__id=form_id)
    for sampleexamresult in sampleexamresults:
        sampleexamresultdict = {
            "value": sampleexamresult.value,
            "sample_id": sampleexamresult.sample_exam.sample.id,
            "result": sampleexamresult.result_organ.result.name,
        }
        sampleexamresultempty.append(sampleexamresultdict)

    analysisoptionalresult = AnalysisOptionalResult.objects.filter(analysis__id=form_id).first()
    if analysisoptionalresult is not None:
        result_name = analysisoptionalresult.result.name
    else:
        result_name = "Nombre de resultado no encontrado"
    

    context["result_name"] = result_name
    context["analysis"] = analysis
    context["samples"] = list_empty
    context["identifications"] = identifications_list
    context["entryform"] = entryForm
    context["sampleexamresults"] = sampleexamresultempty
    print(context["result_name"])

    route = "app/consolidados/consolidado_SG/consolidado_sg.html" 
    return context, route

def saveConsolidadoScoreGill(request, form_id):
     
    analysis = AnalysisForm.objects.get(id=form_id)
    request = request.POST
    print(request)

    try:
        for key, value in request.items():
            keys = key[5:-1].split("-")
            print(keys)

            if keys[0] == "mar_opcional":
                print(value)
                result = Result.objects.get(name=value, type_result__id__in=[3,4,5,6,7])
                analysisresult = AnalysisOptionalResult.objects.update_or_create(analysis=analysis, defaults={'result': result})
            else:
                sample_exam = SampleExams.objects.get(sample__id=keys[0], organ__id=51, exam=analysis.exam, stain=analysis.stain)
                result = Result.objects.get(type_result__id__in=[3,4,5,6,7], name=keys[1])
                resultorgan = ResultOrgan.objects.get(organ__id=51, result=result)
                sampleexamresult, created = SampleExamResult.objects.update_or_create(sample_exam=sample_exam, result_organ=resultorgan, defaults={'value': value})
                analysisSampleExmanResult = AnalysisSampleExmanResult.objects.update_or_create(analysis=analysis, sample_exam_result=sampleexamresult,  defaults={'created_at': datetime.now()})
        return JsonResponse({'ok': True})
    except Exception as e:
        print(e)
        return JsonResponse({"ok": False, "error":e.__str__()})
    """
    print(request.POST)
    data = request.POST
    return
    """