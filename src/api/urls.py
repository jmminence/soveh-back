from django.urls import include, path
from rest_framework import routers
from rest_framework.urlpatterns import format_suffix_patterns
from api.views import *

app_name = "api"

router = routers.DefaultRouter()
router.register(r"entryforms", EntryFormViewSet)
router.register(r"preinvoices", PreinvoiceViewSet)
router.register(r"invoices", InvoiceViewSet)
router.register(r"responsibles", ResponsibleViewSet)

urlpatterns = format_suffix_patterns(
    [
        path("case-file/<int:pk>", DestroyCaseFile.as_view(), name="casefile-destroy"),
        path("centers", CenterList.as_view(), name="center-list"),
        path("customers", CustomerList.as_view(), name="customer-list"),
        path("currencies", CurrencyList.as_view(), name="currency-list"),
        path("email-templates", EmailTemplateList.as_view(), name="emailtemplate-list"),
        path("exams", ExamList.as_view(), name="exam-list"),
        path("fixatives", FixativeList.as_view(), name="fixative-list"),
        path("larvalstages", LarvalStageList.as_view(), name="larvalstage-list"),
        path("organs/", OrganList.as_view(), name="organ-list"),
        path("species", SpecieList.as_view(), name="specie-list"),
        path("stains", StainList.as_view(), name="stain-list"),
        path("user", UserDetail.as_view(), name="user-detail"),
        path("watersources", WaterSourceList.as_view(), name="watersource-list"),
        path("analysis", AnalysisView.as_view(), name="sample-detail"),
        path("analysis/indicators", analysis_financial_indicators, name="sample-detail"),
        path("analysis/preinvoices", AnalysisPreinvoiceList.as_view(), name="analysis-preinvoice"),
        path("analysis/preinvoices/<int:pk>", AnalysisPreinvoiceUpdate.as_view(), name="analysis-preinvoice-update"),
        path("exchange-rates/import", exchange_rate_import, name="exchange-rate-import"),
        path("exchange-rates", ExchangeRateView.as_view(), name="exchange-rate"),
        path("preinvoices/import-file", PreinvoiceImportView.as_view(), name="analysis-preinvoice-import"),
        path("invoices/import-file", InvoiceImportView.as_view(), name="preinvoice-invoice-import"),
        path("preinvoice-file/<int:pk>", DestroyPreinvoiceFile.as_view(), name="preinvoicefile-destroy"),
    ]
)

urlpatterns += router.urls
