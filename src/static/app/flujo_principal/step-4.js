var researches;

function init_step_4(active = true) {
  var entryform_id = $("#entryform_id").val();
  var url = Urls.analysis_entryform_id(entryform_id);

  $.ajax({
    type: "GET",
    url: url,
    async: false,
  })
    .done(function (data) {
      $(".showShareBtn").removeClass("hidden");
      $(".showLogBtn").removeClass("hidden");
      $(".showSummaryBtn").removeClass("hidden");
      $(".showReceptionFileBtn").removeClass("hidden");
      $(".showAttachedFilesBtn").removeClass("hidden");
      saltar = true;
      loadAnalysisData(data);
      researches = data.research_types_list;

      //loadResearches(data.research_types_list)
    })
    .fail(function () {
      console.log("Fail");
    });
}

function loadAnalysisData(data) {
  $("#analysis_group").empty();

  populateAnalysisData(data);

  if (data.analysis_with_zero_sample) {
    alertEmptyAnalysis();
  }
}

function alertEmptyAnalysis() {
  swal({
    title: "Información",
    text:
      "Hay servicios ingresados que no poseen muestras asociadas (en rojo), por lo cual recomendamos anular.",
    icon: "warning",
    showCancelButton: false,
  });
}

function loadResearches() {
  $("#service_researches").html(
    '<select multiple="multiple" size="10" id="researches_select"></select>'
  );

  $.each(researches, function (i, item) {
    $("#researches_select").append(
      $("<option>", {
        value: item.id,
        text: item.code + " " + item.name,
      })
    );
  });
  $("#researches_select").bootstrapDualListbox({
    nonSelectedListLabel: "No seleccionados",
    selectedListLabel: "Asociados al servicio",
    infoText: "Mostrando todos {0}",
    infoTextEmpty: "Lista vacía",
    filterTextClear: "Mostrar todos",
  });
}

function populateAnalysisData(data) {
  $("#analysis_group1").html("");
  $("#analysis_group2").html("");

  $.each(data.analyses, function (i, item) {
    var row = {};

    row.form_id = item.form_id;
    row.id = item.id;
    row.exam_name = item.exam_name;
    row.exam_stain = item.exam_stain;
    row.exam_pathologists_assignment = item.exam_pathologists_assignment;
    row.pre_report_started = item.pre_report_started;
    row.pre_report_ended = item.pre_report_ended;
    row.no_slice = item.slices.length;
    row.current_step = item.current_step;
    row.total_step = item.total_step;
    row.percentage_step = item.percentage_step;
    row.current_step_tag = item.current_step_tag;
    row.form_closed = item.form_closed;
    row.cancelled = item.cancelled;
    row.form_reopened = item.form_reopened;
    // row.histologico = item.exam_type == 1;
    // saltar=saltar && item.exam_type == 2;
    row.service = item.service;
    row.service_name = item.service_name;
    row.patologo_name = item.patologo_name;
    row.patologo_id = item.patologo_id;
    row.status = item.status;
    row.cancelled_by = item.cancelled_by;
    row.cancelled_at = item.cancelled_at;
    row.samples_count = item.samples_count;
    row.report_code = item.report_code;
    row.on_hold = item.on_hold;
    row.on_standby = item.on_standby;
    row.samples_charged = item.samples_charged;

    if (!row.cancelled) {
      addAnalysisElement(row);
    } else {
      addAnalysisElementCancelled(row);
    }

    $("#analysis-tab1").trigger("click");
  });
}

function addAnalysisElement(data) {
  var analysis_element5 = document.getElementById("analysis_element5");
  if (!analysis_element5) return;
  var analysisElementTemplate = analysis_element5.innerHTML;
  var templateFn = _.template(analysisElementTemplate);
  var templateHTML = templateFn(data);

  $("#analysis_group1").append(templateHTML);
}

function addAnalysisElementCancelled(data) {
  var analysis_element5 = document.getElementById("analysis_element5");
  if (!analysis_element5) return;
  var analysisElementTemplate = analysis_element5.innerHTML;
  var templateFn = _.template(analysisElementTemplate);
  var templateHTML = templateFn(data);

  $("#analysis_group2").append(templateHTML);
}

// function showServiceCommentsModal(form_id){
//   $('#service_comments_modal').modal('show');
// }

function deleteExternalReport(analysis_id, id) {
  var url = Urls.service_reports_id(analysis_id, id);
  $.ajax({
    type: "DELETE",
    url: url,
  })
    .done(function (data) {
      toastr.success("", "Informe eliminado exitosamente.");
      $("#sr-" + id).remove();
    })
    .fail(function () {
      toastr.error(
        "",
        "No ha sido posible eliminar el informe. Intente nuevamente."
      );
    });
}

function deleteServiceComment(analysis_id, id) {
  var url = Urls.service_comments_id(analysis_id, id);
  $.ajax({
    type: "DELETE",
    url: url,
  })
    .done(function (data) {
      toastr.success("", "Comentario eliminado exitosamente.");
      $("#sc-" + id).remove();
    })
    .fail(function () {
      toastr.error(
        "",
        "No ha sido posible eliminar el comentario. Intente nuevamente."
      );
    });
}

function deleteServiceResearch(analysis_id, id) {
  var url = Urls.service_researches_id(analysis_id, id);
  $.ajax({
    type: "DELETE",
    url: url,
  })
    .done(function (data) {
      toastr.success("", "Estudio eliminado exitosamente.");
      $("#rc-" + id).remove();
    })
    .fail(function () {
      toastr.error(
        "",
        "No ha sido posible eliminar el estudio. Intente nuevamente."
      );
    });
}

function showServiceReportsModal(
  id,
  service,
  case_closed,
  form_closed = false
) {
  $("#service_reports_internal").html("");
  if (service == 1) {
    var temp_internal = "<h4>Generado por el sistema</h4>";
    temp_internal += '<div class="col-sm-12 pl-2 pb-2">';
    temp_internal +=
      '<a target="_blank" href="/download-report/' +
      id +
      '"><i class="fa fa-download"></i> Descargar Informe</a>';
    temp_internal += "</div>";
    $("#service_reports_internal").html(temp_internal);
  }

  $("#service_reports_external").html("");
  $("#service_final_report").html("");
  var temp_external = "<h4>Agregados manualmente</h4>";
  temp_external += '<div id="reports_list" class="col-sm-12 pl-2 pb-2">';
  // var temp_final = "<h4>Agregados manualmente</h4>";
  // temp_final += '<div id="reports_list" class="col-sm-12 pl-2 pb-2">';
  var url = Urls.service_reports(id);
  $.ajax({
    type: "GET",
    url: url,
  })
    .done(function (data) {
      if (data.reports.length > 0) {
        if (!form_closed) {
          $.each(data.reports, function (index, value) {
            temp_external +=
              '<div id="sr-' +
              value.id +
              '"><button class="btn btn-sm btn-danger" onclick="deleteExternalReport(' +
              id +
              ", " +
              value.id +
              ')"><i class="fa fa-close"></i></button> <a target="_blank" href="' +
              value.path +
              '"><i class="fa fa-download"></i> ' +
              value.name +
              "</a></div>";
          });
        } else {
          $.each(data.reports, function (index, value) {
            if(value.final_report){
              var temp_final = "<h4>Reporte Final</h4>";
              temp_final += '<div id="reports_list" class="col-sm-12 pl-2 pb-2">';
              temp_final +=
              '<div id="sr-' +
              value.id +
              '"><a target="_blank" href="' +
              value.path +
              '"><i class="fa fa-download"></i> ' +
              value.name +
              "</a></div>";
              $("#service_final_report").html(temp_final);
            }else{
              temp_external +=
              '<div id="sr-' +
              value.id +
              '"><a target="_blank" href="' +
              value.path +
              '"><i class="fa fa-download"></i> ' +
              value.name +
              "</a></div>";
            }
          });
        }
      } else {
        temp_external +=
          '<div><h5 class="not_available_text">No hay informes disponibles</h5>';
      }
      temp_external += "</div>";
      $("#service_reports_external").html(temp_external);
    })
    .fail(function () {
      console.log("Fail");
    });

  if (!form_closed) {
    var url = Urls.service_reports(id);
    var temp_uploader = "<h4>Cargador de informes</h4>";
    temp_uploader +=
      '<div class="col-sm-12"><form id="reports_uploader" action="' +
      url +
      '" class="dropzone needsclick">';
    temp_uploader += '<div class="dz-message" data-dz-message>';
    temp_uploader +=
      "<center><span><h3>Arrastra o selecciona el informe que deseas cargar</h3></span></center>";
    temp_uploader += "</div>";
    temp_uploader += "</form></div>";
    // temp += '<input type="reset" class="btn btn-secondary" data-dismiss="modal" value="Salir">';
    // temp += '<input type="button" class="btn btn-primary submit-file" value="Cargar Imágen""></div></div></div>';
    $("#service_reports_external_uploader").html("");
    $("#service_reports_external_uploader").html(temp_uploader);

    $("#reports_uploader").dropzone({
      autoProcessQueue: false,
      maxFilesize: 600,
      acceptedFiles: ".csv, .doc, .docx, .ods, .odt, .pdf, .xls, .xlsx, .xlsm",
      init: function () {
        var submitButton = document.querySelector(".submit-file");
        myDropzone = this;
        submitButton.addEventListener("click", function () {
          myDropzone.processQueue();
        });
        this.on("sending", function (file, xhr, formData) {
          lockScreen(1);
        });

        this.on("success", function (file, responseText) {
          if (responseText.ok) {
            toastr.success("", "Informe cargado exitosamente.");
            this.removeFile(file);
            $(".not_available_text").remove();
            $("#reports_list").prepend(
              '<div id="sr-' +
                responseText.file.id +
                '"><button class="btn btn-sm btn-danger" onclick="deleteExternalReport(' +
                id +
                ", " +
                responseText.file.id +
                ')"><i class="fa fa-close"></i></button> <a target="_blank" href="' +
                responseText.file.path +
                '"><i class="fa fa-download"></i> ' +
                responseText.file.name +
                "</a></div>"
            );
          } else {
            toastr.error(
              "",
              "No ha sido posible cargar el informe. Intente nuevamente."
            );
          }
          lockScreen(0);
        });

        this.on("error", function (file, response) {
          this.removeFile(file);
          bootbox.hideAll();
          toastr.error(
            "",
            "No ha sido posible cargar el informe. Intente nuevamente."
          );
          lockScreen(0);
        });

        this.on("addedfile", function () {
          if (this.files[1] != null) {
            this.removeFile(this.files[0]);
          }
        });
      },
    });
  }

  $("#service_reports_modal").modal("show");
}

function showServiceCommentsModal(id, case_closed, form_closed = false) {
  var temp = "";
  var url = Urls.service_comments(id);
  $.ajax({
    type: "GET",
    url: url,
  })
    .done(function (data) {
      if (data.comments.length > 0) {
        if (!form_closed) {
          $.each(data.comments, function (index, value) {
            temp +=
              '<p id="sc-' +
              value.id +
              '"><button class="btn btn-sm btn-danger" onclick="deleteServiceComment(' +
              id +
              ", " +
              value.id +
              ')"><i class="fa fa-close"></i></button> <b>' +
              value.done_by +
              " (" +
              value.created_at +
              "):</b> <br> " +
              value.text +
              "</p>";
          });
        } else {
          $.each(data.comments, function (index, value) {
            temp +=
              '<p id="sc-' +
              value.id +
              '"><b>' +
              value.done_by +
              " (" +
              value.created_at +
              "):</b> <br> " +
              value.text +
              "</p>";
          });
        }
      } else {
        temp +=
          '<p><h5 class="not_available_text">No hay comentarios disponibles</h5></p>';
      }

      if (!form_closed) {
        temp += "<h3>Ingresar nuevo comentario:</h3>";
        if (case_closed != 0) {
          temp +=
            '<div class="col-sm-12"><textarea data-id="' +
            id +
            '" class="form-control disabled" rows="3" id="input_service_comment"></textarea></div>';
        } else {
          temp +=
            '<div class="col-sm-12"><textarea data-id="' +
            id +
            '" class="form-control" rows="3" id="input_service_comment"></textarea></div>';
        }
      }

      $("#service_comments").html(temp);
    })
    .fail(function () {
      console.log("Fail");
    });

  $("#service_comments_modal").modal("show");
}

function showServiceResearchesModal(id, case_closed, form_closed = false) {
  $("#researches_modal_save_button").prop("disabled", false);
  var temp = "";
  var url = Urls.service_researches(id);
  $.ajax({
    type: "GET",
    url: url,
  })
    .done(function (data) {
      if (form_closed || case_closed) {
        $("#researches_modal_save_button").prop("disabled", true);
        $("#service_researches").html("");
        if (data.researches.length == 0) {
          $("#service_researches").append(
            "<p><h3 class='text-danger'>No hay estudios asociados al servicio.</h3></p>"
          );
        } else {
          $.each(data.researches, function (index, item) {
            $("#service_researches").append(
              "<p><h4>" +
                item.code +
                " " +
                item.name +
                ": " +
                item.description +
                "</h4></p>"
            );
          });
        }
      } else {
        loadResearches();
        $("#researches_select").data("id", id);
        $.each(data.researches, function (index, item) {
          if (
            $('#researches_select option[value="' + item.id + '"]').length == 0
          ) {
            $("#researches_select").append(
              $("<option>", {
                value: item.id,
                text: item.code + " " + item.name,
                disabled: "disabled",
                selected: "selected",
              })
            );
          } else {
            $('#researches_select option[value="' + item.id + '"]').prop(
              "selected",
              true
            );
          }
        });
        $("#researches_select").bootstrapDualListbox("refresh");
      }
    })
    .fail(function () {
      console.log("Fail");
    });
  $("#service_researches_modal").modal("show");
}

function saveServiceComment() {
  var id = $("#input_service_comment").data("id");
  var text = $("#input_service_comment").val();
  var url = Urls.service_comments(id);
  $.ajax({
    type: "POST",
    url: url,
    data: { comment: text },
  })
    .done(function (data) {
      $(".not_available_text").remove();
      $("#service_comments").prepend(
        '<p id="sc-' +
          data.comment.id +
          '"><button class="btn btn-sm btn-danger" onclick="deleteServiceComment(' +
          id +
          ", " +
          data.comment.id +
          ')"><i class="fa fa-close"></i></button> <b>' +
          data.comment.done_by +
          " (" +
          data.comment.created_at +
          "):</b> <br> " +
          data.comment.text +
          "</p>"
      );
    })
    .fail(function () {
      console.log("Fail");
    });
}

function saveServiceResearch() {
  var id = $("#researches_select").data("id");
  var url = Urls.service_researches(id);

  var values_selected = $("#researches_select").val();
  var values_disabled_selected = $(
    "#researches_select option[disabled]:selected"
  ).val();

  var values = values_selected.concat(values_disabled_selected);

  $.ajax({
    type: "POST",
    url: url,
    data: { researches: values },
  })
    .done(function (data) {
      // research_select.prop('disabled', true);
      if (data.ok) {
        toastr.success("Listo", "Estudios guardados exitosamente.");
      } else {
        toastr.error("Lo sentimos", "Error al guardar estudios.");
      }
    })
    .fail(function () {
      console.log("Fail");
    });
}

function closeService(form_id, analysis_id, can_close = true) {
  var got_reports = 0;
  var got_comments = 0;

  var url = Urls.service_comments(analysis_id);
  $.ajax({
    type: "GET",
    url: url,
    async: false,
  }).done(function (data) {
    if (data.comments.length > 0) {
      got_comments = data.comments.length;
    }
  });

  var url = Urls.service_reports(analysis_id);
  $.ajax({
    type: "GET",
    url: url,
    async: false,
  }).done(function (data) {
    if (data.reports.length > 0) {
      got_reports = data.reports.length;
    }
  });

  if (can_close) {
    bootbox.dialog({
      title: "<h3>Confirmación de cierre de servicio</h3>",
      message:
        "<p>El servicio posee " +
        got_reports +
        " reportes adjuntos y " +
        got_comments +
        " comentarios. \
        <p>¿Confirma que desea realizar el cierre del servicio?</p> \
        <p>Ingrese una fecha de cierre:</p> \
        <p><input type='text' required class='form-control input-closing-date-bootbox' /> </p>\
        <p>Ingrese el código del informe:</p> \
        <p><input type='text' required class='form-control input-report-code-bootbox' /></p> \
        <div class='alert alert-danger hidden alert-closing-service' role='alert'></div>",
      buttons: {
        cancel: {
          label: "Cancelar",
          className: "btn-danger",
        },
        ok: {
          label: "Confirmar",
          className: "btn-info",
          callback: function () {
            $(".alert-closing-service").html("");
            $(".alert-closing-service").addClass("hidden");
            var closing_date = $(".input-closing-date-bootbox").val();
            var report_code = $(".input-report-code-bootbox").val();
            var err = false;
            if (closing_date == "") {
              $(".alert-closing-service").append(
                "<p>Ingrese la fecha de cierre para continuar</p>"
              );
              $(".alert-closing-service").removeClass("hidden");
              err = true;
            }
            if (report_code == "") {
              $(".alert-closing-service").append(
                "<p>Ingrese el código del informe para continuar</p>"
              );
              $(".alert-closing-service").removeClass("hidden");
              err = true;
            }
            if (!err) {
              var url = Urls.close_service(form_id, closing_date);
              $.ajax({
                type: "POST",
                url: url,
                data: { "report-code": report_code },
              })
                .done(function (data) {
                  window.location.reload();
                })
                .fail(function () {
                  console.log("Fail");
                });
            } else {
              return false;
            }
          },
        },
      },
    });

    $(".input-closing-date-bootbox").datetimepicker({
      locale: "es",
      keepOpen: false,
      format: "DD-MM-YYYY",
      defaultDate: moment(),
    });
  } else {
    swal({
      title: "Información",
      text:
        "Lo sentimos, aún no es posible cerrar el servicio ya que no ha iniciado la lectura o finalizado el pre-informe.",
      icon: "error",
      showCancelButton: true,
    });
  }
}

function cancelService(form_id) {
  bootbox.dialog({
    title: "<h3>Confirmación de anulación de servicio</h3>",
    message:
      "<p>¿Confirma que desea realizar la anulación del servicio?</p> \
      <p>Ingrese una fecha de anulación:</p> \
      <input type='text' class='form-control input-cancel-date-bootbox' /> \
      <br><p>Comentario:</p> \
      <textarea row='3' required class='form-control input-cancel-comment-bootbox'></textarea>",
    buttons: {
      cancel: {
        label: "Cancelar",
        className: "btn-danger",
      },
      ok: {
        label: "Confirmar",
        className: "btn-info",
        callback: function () {
          var cancel_date = $(".input-cancel-date-bootbox").val();
          var comment = $(".input-cancel-comment-bootbox").val();

          if (!cancel_date || !comment) {
            toastr.error(
              "Complete la información solicitada.",
              "No ha sido posible continuar con la anulación"
            );
            return false;
          }
          var url = Urls.cancel_service(form_id);
          $.ajax({
            type: "POST",
            url: url,
            data: { date: cancel_date, comment: comment },
          })
            .done(function (data) {
              window.location.reload();
            })
            .fail(function () {
              console.log("Fail");
            });
        },
      },
    },
  });

  $(".input-cancel-date-bootbox").datetimepicker({
    locale: "es",
    keepOpen: false,
    format: "DD-MM-YYYY",
    defaultDate: moment(),
  });
}

function reopenSerivce(form_id) {
  bootbox.dialog({
    title: "<h3>Confirmación de reapertura del servicio</h3>",
    message:
      "<p>¿Confirma que desea realizar la reapertura del servicio?</p> \
      <p>Ingrese una fecha de reapertura:</p> \
      <input type='text' class='form-control input-cancel-date-bootbox' /> \
      <br><p>Comentario:</p> \
      <textarea row='3' required class='form-control input-cancel-comment-bootbox'></textarea>",
    buttons: {
      cancel: {
        label: "Cancelar",
        className: "btn-danger",
      },
      ok: {
        label: "Confirmar",
        className: "btn-info",
        callback: function () {
          var reopen_date = $(".input-cancel-date-bootbox").val();
          var comment = $(".input-cancel-comment-bootbox").val();

          if (!reopen_date || !comment) {
            toastr.error(
              "Complete la información solicitada.",
              "No ha sido posible continuar con la anulación"
            );
            return false;
          }
          var url = Urls.reopen_form(form_id);
          $.ajax({
            type: "POST",
            url: url,
            data: { date: reopen_date, comment: comment },
          })
            .done(function (data) {
              window.location.reload();
            })
            .fail(function () {
              console.log("Fail");
            });
        },
      },
    },
  });

  $(".input-cancel-date-bootbox").datetimepicker({
    locale: "es",
    keepOpen: false,
    format: "DD-MM-YYYY",
    defaultDate: moment(),
  });
}

function initPreReport(analysis_id) {
  bootbox.dialog({
    title: "<h3>Confirmación</h3>",
    message: "<p>¿Confirma que desea iniciar la lectura?</p>",
    buttons: {
      cancel: {
        label: "Cancelar",
        className: "btn-danger",
      },
      ok: {
        label: "Confirmar",
        className: "btn-info",
        callback: function () {
          var url = Urls.init_pre_report(analysis_id);
          $.ajax({
            type: "POST",
            url: url,
          })
            .done(function (data) {
              window.location.reload();
            })
            .fail(function () {
              console.log("Fail");
            });
        },
      },
    },
  });
}

function endPreReport(analysis_id) {
  $("#modalAnalysisId").val(analysis_id);
  $("#checkQAPreReport").modal("show");

  $(".input-end-pre-report-date-bootbox").datetimepicker({
    locale: "es",
    keepOpen: false,
    format: "DD-MM-YYYY HH:mm",
    defaultDate: moment(),
  });
}

$("#btnDoneQA").click(() => {
  let isAnyCheckboxFalse = false;
  $(".checkQA").each(function () {
    const isCurrentCheckboxChecked = $(this).is(":checked");
    if (!isCurrentCheckboxChecked) {
      isAnyCheckboxFalse = true;
    }
  });

  if (isAnyCheckboxFalse) {
    toastr.error(
      "Debe marcar todos los checks",
      "No ha sido posible continuar con el cierre."
    );
    return;
  }
  const analysis_id = $("#modalAnalysisId").val();
  const end_date = $(".input-end-pre-report-date-bootbox").val();
  const comment = JSON.stringify($("#preReportComment").val());

  $("#btnDoneQA").attr("disabled", true);

  var url = Urls.end_pre_report(analysis_id, end_date);
  $.ajax({
    type: "POST",
    url: url,
    data: {
      comment,
    },
  })
    .done(function (data) {
      window.location.reload();
    })
    .fail(function () {
      $("#btnDoneQA").attr("disabled", false);
    });
});

function getCookie(name) {
  var cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    var cookies = document.cookie.split(";");
    for (var i = 0; i < cookies.length; i++) {
      var cookie = jQuery.trim(cookies[i]);
      // Does this cookie string begin with the name we want?
      if (cookie.substring(0, name.length + 1) === name + "=") {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

function goToPortal(id, service, reportCode) {
  //if (service.toUpperCase() !== "SCORE_GILL") {
    var url = Urls.consolidado(id);
    window.location.href = url;
    return;
  }

/*  Swal.fire({
    title: "Ingrese el codigo del informe (Opcional)",
    input: "text",
    inputAttributes: {
      autocapitalize: "off",
    },
    inputValue: reportCode,
    showCancelButton: true,
    confirmButtonText: "Ok, ir al portal",
    showLoaderOnConfirm: true,
    allowOutsideClick: () => !Swal.isLoading(),
  }).then((result) => {
    if (result.isConfirmed) {
      Swal.fire({
        title: "Preparando el portal para generar el informe.",
        allowOutsideClick: false,
      });
      Swal.showLoading();
      const report_code = result.value;

      $.ajax(Urls["lab:refresh_portal"](id), {
        data: JSON.stringify({
          report_code,
        }),

        method: "POST",

        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
        },

        contentType: "application/json; charset=utf-8",

        success: (data, textStatus) => {
          Swal.close();
          if (data.url !== undefined) {
            window.open(data.url, "_blank");
          } else if (data.result.length > 0) {
            toastr.error("Error inyectando informacion al portal.");
          }
        },
        error: (xhr, textStatus, error) => {
          Swal.close();
          Swal.fire({
            icon: "error",
            title: "Ocurrió un error actualizando el portal",
          });
          console.error({ xhr, textStatus, error });
        },
      });
    }
  });
}*/

function startPause(id, hold) {
  const is_hold = hold;
  Swal.fire({
    title: "Ingrese motivo o comentario",
    input: "text",
    showCancelButton: true,
    confirmButtonText: "Ok",
    showLoaderOnConfirm: true,
    inputValidator: (value) => {
      if (!value) {
        return "Obligatorio.";
      }
    },
    allowOutsideClick: () => !Swal.isLoading(),
  }).then((result) => {
    if (result.isConfirmed) {
      Swal.showLoading();
      const motive = result.value;

      $.ajax(Urls["toggle_analysis_status"](id), {
        data: JSON.stringify({
          motive,
          is_hold,
        }),

        method: "POST",

        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
        },

        contentType: "application/json; charset=utf-8",

        success: (data, textStatus) => {
          Swal.close();
          window.location.reload();
        },
        error: (xhr, textStatus, error) => {
          Swal.close();
          Swal.fire({
            icon: "error",
            title: "Ocurrió un error.",
          });
          console.error({ xhr, textStatus, error });
        },
      });
    }
  });
}

function stopPause(id, hold) {
  const is_hold = hold;
  Swal.fire({
    title: "Se va a reanudar el servicio",
    showCancelButton: true,
    confirmButtonText: "Ok",
    showLoaderOnConfirm: true,
    allowOutsideClick: () => !Swal.isLoading(),
  }).then((result) => {
    if (result.isConfirmed) {
      Swal.showLoading();
      $.ajax(Urls["toggle_analysis_status"](id), {
        data: JSON.stringify({
          is_hold,
        }),

        method: "POST",

        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
        },

        contentType: "application/json; charset=utf-8",

        success: (data, textStatus) => {
          Swal.close();
          window.location.reload();
        },
        error: (xhr, textStatus, error) => {
          Swal.close();
          Swal.fire({
            icon: "error",
            title: "Ocurrió un error.",
          });
          console.error({ xhr, textStatus, error });
        },
      });
    }
  });
}

function onClickGrouper(id) {
  $("#groupersModal").modal("show");
  $("#newGroupAnalysis").val(id);
  const groupList = $("#groupList");
  groupList.empty();

  $.get(Urls["review:groupers"]() + `?pk=${id}`, (data, status) => {
    const groupers = JSON.parse(data.groupers);
    const selected = JSON.parse(data.selected);
    for (const group of groupers) {
      let classes = "btn ";
      let btnText;
      if (selected.some((element) => element.fields.grouper == group.pk)) {
        classes += "btn-danger";
        btnText = "Sacar del grupo";
      } else {
        classes += "btn-success";
        btnText = "Agregar al grupo";
      }
      const button = `<button class="${classes}" onclick="toggleAnalysisGrouper(${id}, ${group.pk})">${btnText}</button>`;
      const row = `<li class="list-group-item d-flex flex-row justify-content-between">${group.fields.name} (#${group.pk}) ${button}</li>`;
      groupList.append(row);
    }
  });
}

function toggleAnalysisGrouper(analysisPk, grouperPk) {
  $.ajax(Urls["review:groupers"](), {
    data: JSON.stringify({
      analysis_pk: analysisPk,
      grouper_pk: grouperPk,
    }),

    method: "PUT",
    headers: {
      "X-CSRFToken": getCookie("csrftoken"),
    },
    contentType: "application/json; charset=utf-8",
    success: (data, textStatus) => {
      Swal.close();
      onClickGrouper(analysisPk);
    },
    error: (xhr, textStatus, error) => {
      Swal.close();
      Swal.fire({
        icon: "error",
        title: "Ocurrió un error.",
      });
      console.error({ xhr, textStatus, error });
    },
  });
}

function createGrouper() {
  const analysisPk = $("#newGroupAnalysis").val();
  const groupName = $("#newGroupName").val();
  $.ajax(Urls["review:groupers"](), {
    data: JSON.stringify({
      pk: analysisPk,
      name: groupName,
    }),

    method: "POST",
    headers: {
      "X-CSRFToken": getCookie("csrftoken"),
    },
    contentType: "application/json; charset=utf-8",
    success: (data, textStatus) => {
      Swal.close();
      onClickGrouper(analysisPk);
    },
    error: (xhr, textStatus, error) => {
      Swal.close();
      Swal.fire({
        icon: "error",
        title: "Ocurrió un error.",
      });
      console.error({ xhr, textStatus, error });
    },
  });
}

function showServiceDeadlineModal(id) {
  $('#serviceDeadline_id').val(id);
  $('.assignment-deadline').datetimepicker({
  locale: 'es',
  keepOpen: false,
  format: 'DD-MM-YYYY'
  });

  var url = Urls.get_serviceDeadline(id);
     $.ajax({
         type: "GET",
         url: url,
     })
     .done(function (data) {
      if(data.exists){
        var laboratoryDeadline = data["data"]["laboratoryDeadline"]
        var pathologistDeadline = data["data"]["pathologistDeadline"]
        var reviewDeadline = data["data"]["reviewDeadline"]
        var comment = data.comment
        $('#comment').val(comment);
        $('#serviceDeadline_exist').val(data.exists);
      }else{
        var laboratoryDeadline = date(data["data"]["laboratoryDeadline"], data.created_at).toLocaleDateString();
        var pathologistDeadline = date(data["data"]["pathologistDeadline"]+data["data"]["laboratoryDeadline"], data.created_at).toLocaleDateString();
        var reviewDeadline = date(data["data"]["reviewDeadline"]+data["data"]["pathologistDeadline"]+data["data"]["laboratoryDeadline"], data.created_at).toLocaleDateString();
        $('#serviceDeadline_exist').val(data.exists);
      }

      if(data["data"]["laboratoryDeadline"] == null){
        document.getElementById('laboratoryDeadline').disabled = true;
        $('#laboratoryDeadline').val("No aplica");
      }else{
        document.getElementById('laboratoryDeadline').disabled = false;
        $('#laboratoryDeadline').val(laboratoryDeadline);
      }

      if(data["data"]["pathologistDeadline"] == null){
        document.getElementById('pathologistDeadline').disabled = true;
        $('#pathologistDeadline').val("No aplica");
      }else{
        document.getElementById('pathologistDeadline').disabled = false;
        $('#pathologistDeadline').val(pathologistDeadline);
      }

      if(data["data"]["reviewDeadline"] == null){
        document.getElementById('reviewDeadline').disabled = true;
        $('#reviewDeadline').val("No aplica");
      }else{
        document.getElementById('reviewDeadline').disabled = false;
        $('#reviewDeadline').val(reviewDeadline);
      }
  })
  .fail(function () {
      console.log("Fail")
  });
  $("#serviceDeadlineModal").modal("show");
}

function saveServiceDeadlineModal(){
  var id = $('#serviceDeadline_id').val();
  var data = $('#serviceDeadline_form input').serializeArray();
  var comment = $('#comment').val();

  data.push({name:"comment", value:comment});
  var exist = $('#serviceDeadline_exist').val();

  if((exist == "true" && comment != "") || exist == "false"){
    $.ajax({
      type: "POST",
      url: '/save_serviceDeadline/'+id,
      data: data,
      async: false,
    })
    .done(function () {
      toastr.success("Fechas guardadas exitosamente.", "Listo!");
      $("#serviceDeadlineModal").modal("hide");
    })
    .fail(function () {
      console.log("Fail");
    })
  }else{
    toastr.warning("Tiene que agregar un comentario");
  }
    
}

function date(days, start){

  var startDate = new Date(start);
  var endDate = "", noOfDaysToAdd = days, count = -1;
  while(count < noOfDaysToAdd){
      endDate = new Date(startDate.setDate(startDate.getDate() + 1));
      if(endDate.getDay() != 0 && endDate.getDay() != 6){
         count++;
      }
  }
  return endDate;
}