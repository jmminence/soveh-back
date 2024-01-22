from django.urls import path
from django.views.decorators.csrf import csrf_exempt
from backend import views

urlpatterns = [
    path("customer", csrf_exempt(views.CUSTOMER.as_view()), name="customer"),
    path("exam", csrf_exempt(views.EXAM.as_view()), name="exam"),
    path("entryform", csrf_exempt(views.ENTRYFORM.as_view()), name="entryform"),
    path(
        "entryform/<int:id>",
        csrf_exempt(views.ENTRYFORM.as_view()),
        name="entryform_id",
    ),
    path(
        "cassettes-entry-form/<int:entry_form>",
        csrf_exempt(views.CASSETTE.as_view()),
        name="cassette_entryform_id",
    ),
    path(
        "workflow/<int:form_id>/<slug:step_tag>",
        csrf_exempt(views.WORKFLOW.as_view()),
        name="workflow_open_step",
    ),
    path("workflow", csrf_exempt(views.WORKFLOW.as_view()), name="workflow"),
    path(
        "workflow/<int:form_id>",
        csrf_exempt(views.WORKFLOW.as_view()),
        name="workflow_w_id",
    ),
    path(
        "analysis-entry-form/<int:entry_form>",
        csrf_exempt(views.ANALYSIS.as_view()),
        name="analysis_entryform_id",
    ),
    path(
        "slice-analysis/<int:analysis_form>",
        csrf_exempt(views.SLICE.as_view()),
        name="slice_analysis_id",
    ),
    path("customer", csrf_exempt(views.CUSTOMER.as_view()), name="customer"),
    path(
        "report-slice/<int:slice_id>",
        csrf_exempt(views.REPORT.as_view()),
        name="report_by_slice",
    ),
    path(
        "report-analysis/<int:analysis_id>",
        csrf_exempt(views.REPORT.as_view()),
        name="report_by_analysis",
    ),
    path(
        "report/<int:report_id>",
        csrf_exempt(views.REPORT.as_view()),
        name="report_by_id",
    ),
    path("report", csrf_exempt(views.REPORT.as_view()), name="report"),
    path(
        "organs-slice/<int:slice_id>/<int:sample_id>",
        csrf_exempt(views.organs_by_slice),
        name="organs_by_slice",
    ),
    path(
        "analysis/<int:analysisform_id>",
        csrf_exempt(views.set_analysis_comments),
        name="set_analysis_comments",
    ),
    path(
        "images/<int:report_id>",
        csrf_exempt(views.IMAGES.as_view()),
        name="images",
    ),
    path(
        "block-timing", csrf_exempt(views.save_block_timing), name="save_block_timing"
    ),
    path(
        "stain-timing", csrf_exempt(views.save_stain_timing), name="save_stain_timing"
    ),
    path("scan-timing", csrf_exempt(views.save_scan_timing), name="save_scan_timing"),
    # path(
    #     'images/<int:image_id>',
    #     csrf_exempt(views.IMAGES.as_view()),
    #     'images_w_id'
    # ),
    path(
        "generalData/<int:id>", csrf_exempt(views.save_generalData), name="generalData"
    ),
    path(
        "sendNotification",
        csrf_exempt(views.sendEmailNotification),
        name="sendNotification",
    ),
    path(
        "workform/<int:form_id>/complete",
        csrf_exempt(views.completeForm),
        name="complete_form",
    ),
    path(
        "workform/<int:form_id>/finish-reception",
        csrf_exempt(views.finishReception),
        name="finish_reception",
    ),
    path(
        "workform/<int:form_id>/save_step1",
        csrf_exempt(views.save_step1),
        name="save_step1",
    ),
    path(
        "service_assigment/",
        csrf_exempt(views.service_assignment),
        name="service_assignment",
    ),
    path(
        "dashboard_analysis",
        csrf_exempt(views.dashboard_analysis),
        name="dashboard_analysis",
    ),
    path(
        "dashboard_reports",
        csrf_exempt(views.dashboard_reports),
        name="dashboard_reports",
    ),
    path("dashboard_lefts", csrf_exempt(views.dashboard_lefts), name="dashboard_lefts"),
    path("responsible", csrf_exempt(views.RESPONSIBLE.as_view()), name="responsible"),
    path(
        "responsible/<int:id>",
        csrf_exempt(views.RESPONSIBLE.as_view()),
        name="responsible_detail",
    ),
    path(
        "emailTemplate",
        csrf_exempt(views.EMAILTEMPLATE.as_view()),
        name="emailTemplate",
    ),
    path(
        "emailTemplate/<int:id>",
        csrf_exempt(views.EMAILTEMPLATE.as_view()),
        name="emailTemplate_detail",
    ),
    path(
        "service_reports/<int:analysis_id>",
        csrf_exempt(views.SERVICE_REPORTS.as_view()),
        name="service_reports",
    ),
    path(
        "service_reports/<int:analysis_id>/<int:id>",
        csrf_exempt(views.SERVICE_REPORTS.as_view()),
        name="service_reports_id",
    ),
    path(
        "service_comments/<int:analysis_id>",
        csrf_exempt(views.SERVICE_COMMENTS.as_view()),
        name="service_comments",
    ),
    path(
        "service_comments/<int:analysis_id>/<int:id>",
        csrf_exempt(views.SERVICE_COMMENTS.as_view()),
        name="service_comments_id",
    ),
    path(
        "service_researches/<int:analysis_id>",
        csrf_exempt(views.SERVICE_RESEARCHES.as_view()),
        name="service_researches",
    ),
    path(
        "service_researches/<int:analysis_id>/<int:id>",
        csrf_exempt(views.SERVICE_RESEARCHES.as_view()),
        name="service_researches_id",
    ),
    path(
        "case_files/<int:entryform_id>",
        csrf_exempt(views.CASE_FILES.as_view()),
        name="case_files",
    ),
    path(
        "case_files/<int:entryform_id>/<int:id>",
        csrf_exempt(views.CASE_FILES.as_view()),
        name="case_files_id",
    ),
    path(
        "close_service/<int:form_id>/<str:closing_date>",
        csrf_exempt(views.close_service),
        name="close_service",
    ),
    path(
        "cancel_service/<int:form_id>",
        csrf_exempt(views.cancel_service),
        name="cancel_service",
    ),
    path(
        "reopen_form/<int:form_id>", csrf_exempt(views.reopen_form), name="reopen_form"
    ),
    path(
        "delete-sample/<int:id>", csrf_exempt(views.delete_sample), name="delete-sample"
    ),
    path(
        "list-identification/<int:entryform_id>",
        csrf_exempt(views.list_identification),
        name="list_identification",
    ),
    path(
        "units/<int:identification_id>",
        csrf_exempt(views.list_units),
        name="list_units",
    ),
    path(
        "unit/<int:identification_id>/<int:correlative>",
        csrf_exempt(views.create_unit),
        name="create_unit",
    ),
    path("remove-unit/<int:id>", csrf_exempt(views.remove_unit), name="remove_unit"),
    path("save-units", csrf_exempt(views.save_units), name="save_units"),
    path(
        "identification/<int:id>",
        csrf_exempt(views.save_identification),
        name="identification",
    ),
    path(
        "new-identification/<int:entryform_id>/<int:correlative>",
        csrf_exempt(views.new_empty_identification),
        name="new_identification",
    ),
    path(
        "save-new-identification/<int:id>",
        csrf_exempt(views.save_new_identification),
        name="save_new_identification",
    ),
    path(
        "remove-identification/<int:id>",
        csrf_exempt(views.remove_identification),
        name="remove_identification",
    ),
    path(
        "end-pre-report/<int:analysis_id>/<str:end_date>",
        csrf_exempt(views.end_pre_report),
        name="end_pre_report",
    ),
    path(
        "init-pre-report/<int:analysis_id>",
        csrf_exempt(views.init_pre_report),
        name="init_pre_report",
    ),
    path("save-scores/<str:type>/<int:id>", csrf_exempt(views.save_scores), name="save_scores"),
    path("get-scores/<str:type>/<int:id>", csrf_exempt(views.get_scores), name="get_scores"),
    path("research/<int:id>", csrf_exempt(views.RESEARCH.as_view()), name="research"),
    path(
        "get-research/<int:id>",
        csrf_exempt(views.get_research_metadata),
        name="get_research",
    ),
    path(
        "force-step/<int:form>/<int:step>",
        csrf_exempt(views.force_form_to_step),
        name="force_form_to_step",
    ),
    path(
        "fix-missing-units",
        csrf_exempt(views.fix_missing_units),
        name="fix_missing_units",
    ),
    path("centers", csrf_exempt(views.centers_list), name="centers_list"),
    path("toggle-analysis-status/<int:pk>", views.toggle_analysis_status, name="toggle_analysis_status"),
    path("get_serviceDeadline/<int:id>", csrf_exempt(views.get_serviceDeadline), name="get_serviceDeadline"),
    path("save_serviceDeadline/<int:id>", csrf_exempt(views.save_serviceDeadline), name="save_serviceDeadline"),
    path("consolidado/<int:form_id>",csrf_exempt(views.ConsolidadosBase.as_view()),name="consolidado"),
    path("consolidado/<int:form_id>/save",csrf_exempt(views.saveConsolidadoHe),name="save_consolidado_he"),
    path("consolidado/<int:form_id>/delete",csrf_exempt(views.deleteDiagnosticConsolidadoHe),name="delete_diagnostic_consolidado_he"),
    path("export_consolidado/<int:id>", csrf_exempt(views.export_consolidado), name="export_consolidado"),
    path("consolidado/<int:id>/save", csrf_exempt(views.analysisReport_save), name="analysisReport_save"),
    path("consolidado/<int:id>/report", csrf_exempt(views.analysis_report), name="analysis_report"),
    path("consolidado/<int:id>/addImage", csrf_exempt(views.analysisReport_addImage), name="analysisReport_addImage"),
    path("consolidado/delete-Img/<int:id>", csrf_exempt(views.analysisReport_deleteImage), name="analysisReport_deleteImage"),
    path("consolidado/<int:id>/template_HE", csrf_exempt(views.template_consolidados_HE), name="template_consolidados_HE"),
    path("consolidado/<int:id>/template_HE_diagnostic", csrf_exempt(views.template_consolidados_HE_diagnostic), name="template_consolidados_HE_diagnostic"),
    path("consolidado/<int:id>/template_HE_contraportada", csrf_exempt(views.template_consolidados_HE_contraportada), name="template_consolidados_HE_contraportada"),
    path("consolidado/<int:id>/download_HE", csrf_exempt(views.download_consolidados_HE), name="download_consolidados_HE"),
    path("consolidado/methodology", csrf_exempt(views.createMethodology), name="createMethodology"),
    path("consolidado/methodology/<int:id>", csrf_exempt(views.saveMethodology), name="saveMethodology"),
    path("consolidado/methodology/<int:id>/addImage", csrf_exempt(views.createMethodologyImage), name="createMethodologyImage"),
    path("consolidado/methodology/<int:id>/deleteImage", csrf_exempt(views.methodology_deleteImage), name="methodology_deleteImage"),
    path("consolidado/methodology/<int:id>/delete", csrf_exempt(views.deleteMethodology), name="deleteMethodology"),
    path("consolidado/analysis/<int:id>/methodology", csrf_exempt(views.ExamMethodologys), name="ExamMethodologys"),
    path("consolidado_sg/<int:form_id>/save",csrf_exempt(views.saveConsolidadoScoreGill),name="save_consolidado_sg"),
]
