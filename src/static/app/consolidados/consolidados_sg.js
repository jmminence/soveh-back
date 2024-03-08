// Agregar names a los inpur y select del formulario
document.getElementById("dataForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var dataForm = new FormData(document.getElementById("dataForm"));
    //var selectValue = dataForm.get('45971-Hiperplasia Lamelar');
    //console.log(selectValue)
});

const form = document.querySelector("#dataForm");
form.addEventListener("submit", save_sg);
function save_sg(event) {
  var id = window.location.pathname.split("/")[2];
  var clear = true;
  event.preventDefault();
  const myFormData = new FormData(event.target);

  const data = {};
  optionalmarselected = ""
  myFormData.forEach(function (value, key) {
    if (key == "mar_opcional") {
      optionalmarselected = value;
    }

    if (key.includes("optionmar")){
      option_diagnostic = key.split("-")
      option_diagnostic[1] = optionalmarselected
      key = option_diagnostic.join("-")
    }

    if (value != "") {
      data[key] = value;
    } else {
      return (clear = false);
    }

  });

  if (clear) {
    $.ajax({
      type: "POST",
      url: Urls.save_consolidado_sg(id),
      data: {
        data: data,
      },
      dataType: "json",
    }).done(function (data) {
      ok = data.ok;
      if (ok) {
        Swal.fire({
          icon: "success",
          title: "Datos guardados",
          showConfirmButton: false,
          timer: 1000,
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Oops...",
          text: "No se pudieron guardar los datos!",
        });
      }
    });
  } else {
    toastr.warning("Complete la informacion necesaria");
  }
}


// Arreglar id bug
// mostrar valores guardados
function load(sampleexamresults, result_name) {
  var select_result = document.getElementsByName("mar_opcional")[0];
  select_result.value = result_name

  sampleexamresults.forEach(function (sampleexamresult) {
    var input = document.getElementById(`${sampleexamresult.sample_id}-${sampleexamresult.result}`);
    if(input==null){
      input = document.getElementsByName(`${sampleexamresult.sample_id}-optionmar`)[0];
    }
    input.value = sampleexamresult.value;
  });
}

function anormalidades_celulares(samples){
  samples.forEach(function (sample) {
    anormalidadescelulares = document.getElementById(`${sample[1].id}-Anormalidades celulares`);
    dependencias = Array.from(document.getElementsByClassName(`${sample[1].id}-anormalidades_celulares`));
    
    dependencias.forEach(function (dependencia) {
      dependencia.addEventListener("change", function () {
        valor = 0
        anormalidadescelulares2 = document.getElementById(`${sample[1].id}-Anormalidades celulares`);
        dependencias2 = Array.from(document.getElementsByClassName(`${sample[1].id}-anormalidades_celulares`));
        dependencias2.forEach(function (dependencia) {
          if (dependencia.value > valor){
            valor = dependencia.value
          }
        });
        anormalidadescelulares2.value = valor
      });
    });
  });
}

function promedio_identifications(identifications){
  identifications.forEach(function (identification) {
    console.log(identification)
    identification_promedios = Array.from(document.getElementsByClassName(`${identification.id}-promedio`));
    identification_promedios.forEach(function (identification_promedio) {
      console.log(identification_promedio)
      result_prom = identification_promedio.id.split("-")
      console.log(result_prom)
      dependencia_prom = Array.from(document.getElementsByClassName(`${result_prom[0]}-${result_prom[1]}`));
      result_prom = 0;
      
      dependencia_prom.forEach(function (dependencia) {
        result_prom += parseInt(dependencia.value);
      });
      console.log(result_prom)
      result_prom = result_prom / dependencia_prom.length;
      result_prom = Math.ceil(result_prom * 10) / 10; // Redondea hacia arriba y mantiene un decimal
      identification_promedio.value = result_prom.toFixed(1); // Formatea el número para tener un decimal
    });
  });
}

//funcion para exportar la informacion de los diagnosticos
$("#export_consolidado").on("click", function (e) {
  e.preventDefault();
  var id = window.location.pathname.split("/")[2];

  Swal.fire({
    title: "Atención!!!",
    text: "Guardaste tus cambios?",
    icon: "warning",
    confirmButtonText: "Si",
    showCancelButton: true,
    cancelButtonText: "No",
  }).then((result) => {
    if (result.isConfirmed) {
      location.href = Urls.export_consolidado(id);
    }
  });
});

// carga la informacion al abrir el modal
$("#report_edit").on("shown.bs.modal", function (e) {
  var id = window.location.pathname.split("/")[2];
  clearHTML();
  $.ajax({
    type: "GET",
    url: Urls.analysis_report(id),
    success: function (data) {
      if (data.report_date != null) {
        report_date = document.getElementById("report_date");
        report_date.value = data.report_date;
      }

      if (data.anamnesis != null && data.anamnesis != "") {
        anamnesis = document.getElementById("anamnesis");
        anamnesis.value = data.anamnesis;
        $("#anamnesis").summernote("code", data.anamnesis);
      }

      if (data.comment != null && data.comment != "") {
        comment = document.getElementById("comment");
        comment.value = data.comment;
        $("#comment").summernote("code", data.comment);
      }

      if (
        data.etiological_diagnostic != null &&
        data.etiological_diagnostic != ""
      ) {
        comment = document.getElementById("etiological_diagnostic");
        comment.value = data.etiological_diagnostic;
        $("#etiological_diagnostic").summernote(
          "code",
          data.etiological_diagnostic
        );
      }

      correlative = document.getElementById("report_correlative");
      correlative.value = data.correlative;

      methodology = document.getElementById("reportMethodology");
      methodology.value = data.methodology;

      data.images.forEach((image) => {
        addImage(image.id, image);
      });
      fileImput_changeName();
    },
  });
});

//funcion que permite ordenar las imagenes
$(function () {
  $(".reportSortable").sortable({
    axis: "y",
    animation: 150,
    handle: ".drag-handle",
    update: function (event) {
      images = event.target.children;
      new_order = [];
      Array.prototype.forEach.call(images, (image) => {
        id = parseInt(image.id.slice(16));
        new_order.push(id);
      });
      id = window.location.pathname.split("/")[2];
      $.ajax({
        type: "POST",
        url: Urls.analysisReport_save(id),
        data: { new_order: new_order },
        success: function (data) {
          console.log(data);
        },
      });
    },
  });
});

// Agrega una nueva imagen, tanto en el HTML como en la Base de datos
$("#addImage").on("click", function (e) {
  var id = window.location.pathname.split("/")[2];
  image_index = document.getElementById("images").childElementCount + 1;
  $.ajax({
    type: "POST",
    url: Urls.analysisReport_addImage(id),
    data: { index: image_index },
    success: function (data) {
      addImage(data.id, "");
      fileImput_changeName();
    },
  });
});

//funcion para cambiar texto en el input file
function fileImput_changeName() {
  inputs = document.getElementsByClassName("custom-file-input");
  Array.prototype.forEach.call(inputs, function (input, index) {
    input.addEventListener("change", function (e) {
      var fileName =
        document.getElementsByClassName("custom-file-input")[index].files[0]
          .name;
      var nextSibling = e.target.nextElementSibling;
      nextSibling.innerText = fileName;
    });
  });
}

//agregar nueva imagen al html
function addImage(id, data) {
  images = document.getElementById("images");

  contenedor = document.createElement("div");
  contenedor.classList.add("form-group", "row", "align-items-center");
  contenedor.setAttribute("id", "container-image-" + id);
  contenedor.insertAdjacentHTML(
    "beforeend",
    `<div class="drag-handle">
             <svg width="25" height="25" fill="currentColor" class="bi bi-chevron-bar-expand" viewBox="0 0 16 16">
                 <path fill-rule="evenodd" d="M3.646 10.146a.5.5 0 0 1 .708 0L8 13.793l3.646-3.647a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 0-.708zm0-4.292a.5.5 0 0 0 .708 0L8 2.207l3.646 3.647a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 0 0 0 .708zM1 8a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 0 1h-13A.5.5 0 0 1 1 8z"/>
             </svg>
         </div>`
  );

  image = document.createElement("div");
  image.classList.add("col-5");
  image.insertAdjacentHTML("beforeend", "<label>Imagen: </label>");

  file_div = document.createElement("div");
  file_div.classList.add("custom-file");

  file_input = document.createElement("input");
  file_input.setAttribute("type", "file");
  file_input.classList.add("custom-file-input");
  file_input.setAttribute("id", "file-" + id);
  file_input.setAttribute("name", "file-" + id);
  file_input.setAttribute("accept", ".jpg, .jpeg, .png");
  file_input.after("Seleccionar");
  file_div.appendChild(file_input);

  file_label = document.createElement("label");
  file_label.classList.add("custom-file-label");
  file_label.innerHTML = "Seleccionar Imagen";
  file_div.appendChild(file_label);
  image.appendChild(file_div);
  contenedor.appendChild(image);
  if (data != "" && data != [] && data.image_name != "") {
    file_input.nextElementSibling.innerText = data.image_name.substring(15);
  }

  size_div = document.createElement("div");
  size_div.classList.add("col-1.5", "form-group", "pt-1");

  size_label = document.createElement("label");
  size_label.innerHTML = "Tamaño:";
  size_div.appendChild(size_label);

  size_select = document.createElement("select");
  size_select.classList.add("form-control");
  size_select.setAttribute("id", "size-" + id);
  size_select.setAttribute("name", "size-" + id);

  size_mediano = document.createElement("option");
  size_mediano.setAttribute("value", "mediano");
  size_mediano.text = "Mediano";
  size_select.appendChild(size_mediano);

  size_grande = document.createElement("option");
  size_grande.setAttribute("value", "grande");
  size_grande.text = "Grande";
  size_select.appendChild(size_grande);

  if (data != "" && data.size != null) {
    size_select.value = data.size;
  }

  size_div.appendChild(size_select);
  contenedor.appendChild(size_div);

  comment_div = document.createElement("div");
  comment_div.classList.add("col");
  contenedor.appendChild(comment_div);

  comment_text = document.createElement("textarea");
  comment_text.classList.add("form-control");
  comment_text.setAttribute("id", "comment-" + id);
  comment_text.setAttribute("rows", 4);
  comment_text.setAttribute("name", "comment-" + id);
  comment_div.appendChild(comment_text);

  if (data != "" && data.size != null) {
    comment_text.value = data.comment;
  }

  delete_div = document.createElement("div");
  delete_div.classList.add("col-1");
  contenedor.appendChild(delete_div);

  delete_button = document.createElement("button");
  delete_button.setAttribute("type", "button");
  delete_button.classList.add("btn", "btn-danger");
  delete_button.setAttribute("id", "delete-" + id);
  delete_button.innerHTML = `<svg width="16" height="16" fill="currentColor" class="bi bi-trash-fill" viewBox="0 0 16 16">
             <path d="M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1H2.5zm3 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5zM8 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7A.5.5 0 0 1 8 5zm3 .5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 1 0z"/>
             </svg>`;
  delete_button.setAttribute("onclick", "deleteImage(" + id + ")");
  delete_div.appendChild(delete_button);

  images.appendChild(contenedor);
  $(`#comment-${id}`).summernote({
    height: 100,
    width: 417,
    lang: "es-ES",
    toolbar: [
      ["style", ["bold", "italic", "underline", "clear"]],
      ["font", ["strikethrough", "superscript", "subscript"]],
      ["color", ["color"]],
    ],
  });
}
//guardar informacion del informe y generar informe
$("#report_edit").on("submit", async function (event) {
  var id = window.location.pathname.split("/")[2];
  event.preventDefault();

  const dataForm = new FormData(this);
  dataForm.delete("methodology");
  if (checkimagesfile() && checkForm()) {
    await $.ajax({
      url: Urls.analysisReport_save(id),
      method: "POST",
      dataType: "json",
      data: dataForm,
      processData: false,
      contentType: false,
      success: function (data) {
        window.open(Urls.download_consolidados_HE(id), "_blank");
      },
      error: function (jqXHR, textStatus, errorThrown) {
        console.error(errorThrown);
      },
    });
  } else {
    toastr.warning("Se necesitan llenar todos los campos");
  }
});

//Funcion para eliminar la imagen seleccionada
function deleteImage(id) {
  images = document.getElementById("images").children;
  new_order = [];
  Array.prototype.forEach.call(images, (image) => {
    id_image = parseInt(image.id.slice(16));
    if (id_image != id) {
      new_order.push(id_image);
    }
  });
  Swal.fire({
    title: "Seguro?!",
    text: "Quieres eliminar esta imagen?",
    icon: "warning",
    confirmButtonText: "Aceptar",
    showCancelButton: true,
    cancelButtonText: "Cancelar",
  }).then((result) => {
    if (result.isConfirmed) {
      $.ajax({
        type: "DELETE",
        url: Urls.analysisReport_deleteImage(id),
        data: { new_order: new_order },
        success: () => {
          img = document.getElementById("container-image-" + id);
          img.remove();
        },
      });
    }
  });
}

//Limpiar HTML
function clearHTML() {
  report_date = document.getElementById("report_date");
  report_anamnesis = document.getElementById("anamnesis");
  report_comment = document.getElementById("comment");
  report_images = document.getElementById("images");

  report_date.value = "";
  report_anamnesis.value = "";
  report_comment.value = "";
  report_images.innerHTML = "";
}

//checkea si hay algun input file sin imagen
function checkimagesfile() {
  var divEspecifico = document.getElementById("images");
  var elementos = divEspecifico.getElementsByTagName("*");

  var elementosFiltrados = [];
  for (var i = 0; i < elementos.length; i++) {
    var elemento = elementos[i];
    if (
      elemento.getAttribute("name") &&
      elemento.getAttribute("name").includes("file-")
    ) {
      elementosFiltrados.push(elemento);
    }
  }

  clear = true;
  elementosFiltrados.forEach(function (elemento) {
    if (
      elemento.nextElementSibling.firstChild.textContent == "Seleccionar Imagen"
    ) {
      clear = false;
    }
  });
  return clear;
}

function checkForm() {
  report_date = document.getElementById("report_date");
  comment = document.getElementById("comment");

  clear = true;

  if (
    report_date.value == null ||
    report_date.value == "" ||
    comment.value == null ||
    comment.value == ""
  ) {
    clear = false;
  }

  return clear;
}

function openMethodologyModal() {
  $("#methodology_modal").modal("show");
}

function addMethodology() {
  var id = window.location.pathname.split("/")[2];
  div = document.getElementById("methodology_table_div");

  $.ajax({
    type: "POST",
    url: Urls.createMethodology(),
    data: { analysis_id: id },
    success: (data) => {
      div.insertAdjacentHTML("beforeend", methodologyTemplate(data));
      methodology = document.getElementById(`methodologyButton-${data.id}`);
      methodology.addEventListener("click", () => {
        OpenCard(data.id);
      });
    },
  });
}

function methodologyTemplate(methodology) {
  var id = methodology.id;
  var title_name = methodology.name;
  if (title_name == undefined) {
    title_name = "Nueva metodologia";
  }

  var name = methodology.name;
  if (name == undefined) {
    name = "";
  }

  var description = methodology.description;
  if (description == undefined) {
    description = "";
  }

  html = `<div id="methodologyCard-${id}" class="card mb-1">
    <div class="card-header d-flex justify-content-between" id="headingOne">
      <h5 class="mb-0">
        <button class="btn btn-link" id="methodologyButton-${id}">
          ${title_name}
        </button>
      </h5>
      <button class="btn btn-success" data-dismiss="modal" onclick="setMethodology(${id})"><i class="fa fa-check"></i></button>
    </div>

    <div id="methodology-${id}" class="collapse form-group" aria-labelledby="headingOne">
      <div class="card-body">
        <div class="pt-1">
            <div class="mb-1">
                <label for="methodologyName-${id}" class="pr-1">Nombre: </label>
                <input id="methodologyName-${id}" type='text' class="form-control col-2" value="${name}" name='methodologyName-${id}'/>
            </div>
            <div class="mb-1">
                <label>Descripción: </label>
                <textarea class="form-control" id="methodologyText-${id}" rows="" name="methodologyText-${id}">${description}</textarea>
            </div>
            <div id="imagesMethodology-${id}" class="mb-1">
            </div>
            <div class="form-group mb-1">
                <button id="" type="button" class="btn btn-outline-primary btn-lg btn-block" onclick="addMethodologyImage(${id})">Añadir una imagen</button>
            </div>
            <hr>
            <div class="d-flex justify-content-between">
                <button type="button" class="btn btn-danger" onclick="deleteMethodology(${id})">Eliminar</button>
                <button type="button" class="btn btn-success" onclick="saveMethodology(${id})">Guardar</button>
            </div>
        </div>
      </div>
    </div>
  </div>`;

  return html;
}

function OpenCard(id) {
  cards = $(".collapse");
  Array.prototype.forEach.call(cards, (card) => {
    if (card.id == `methodology-${id}`) {
      if ($(card).is(":visible")) {
        $(card).hide(300);
      } else {
        $(card).show(300);
      }
    } else {
      $(card).hide(300);
    }
  });
}

function addMethodologyImage(id) {
  image_index =
    document.getElementById(`imagesMethodology-${id}`).childElementCount + 1;
  $.ajax({
    type: "POST",
    url: Urls.createMethodologyImage(id),
    data: { index: image_index },
    success: function (data) {
      images_div = document.getElementById(`imagesMethodology-${id}`);
      images_div.insertAdjacentHTML(
        "beforeend",
        methodologyImageTemplate(data)
      );
      fileImput_changeName();
      imageMethodologySortable(id);
      $(`#commentImageMethodology-${data.id}`).summernote({
        height: 120,
        lang: "es-ES",
        toolbar: [
          ["style", ["bold", "italic", "underline", "clear"]],
          ["font", ["strikethrough", "superscript", "subscript"]],
          ["color", ["color"]],
        ],
      });
    },
  });
}

function methodologyImageTemplate(methodology) {
  id = methodology.id;

  var comment = methodology.comment;
  if (comment == undefined) {
    comment = "";
  }

  html = `<div id="container-methodologyImage-${id}" class="form-group row align-items-center"> 
        <div class="drag-handle">
            <svg width="25" height="25" fill="currentColor" class="bi bi-chevron-bar-expand" viewBox="0 0 16 16">
                <path fill-rule="evenodd" d="M3.646 10.146a.5.5 0 0 1 .708 0L8 13.793l3.646-3.647a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 0-.708zm0-4.292a.5.5 0 0 0 .708 0L8 2.207l3.646 3.647a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 0 0 0 .708zM1 8a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 0 1h-13A.5.5 0 0 1 1 8z"/>
            </svg>
        </div>
        <div class="col-4">
            <label>Imagen: </label>
            <div class="custom-file">
                <input type="file" class="custom-file-input" id="fileMethodology-${id}" name="fileMethodology-${id}" accept=".jpg, .jpeg, .png">
                <label class="custom-file-label">Seleccionar Imagen</label>
            </div>
        </div>
        <div class="col-1.5 form-group pt-1">
            <label>Tamaño:</label>
            <select class="form-control" id="sizeMethodologyImage-${id}" name="sizeMethodologyImage-${id}">
                <option value="mediano">Mediano</option>
                <option value="grande">Grande</option>
            </select>
        </div>
        <div class="col-5">
            <textarea class="form-control" id="commentImageMethodology-${id}" rows="4" name="commentImageMethodology-${id}">${comment}</textarea>
        </div>
        <div>
            <button type="button" class="btn btn-danger" id="deleteImageMethodology-${id}" onclick="deleteImageMethodology(${id})">
                <svg width="16" height="16" fill="currentColor" class="bi bi-trash-fill" viewBox="0 0 16 16">
                    <path d="M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1H2.5zm3 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5zM8 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7A.5.5 0 0 1 8 5zm3 .5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 1 0z"></path>
                </svg>
            </button>
        </div>
    </div>
    `;
  return html;
}

function saveMethodology(id) {
  methodology_div = document.getElementById(`methodology-${id}`);
  methodology_data = methodology_div.querySelectorAll("[name]");

  const dataForm = new FormData();
  methodology_data.forEach((elemento) => {
    if (elemento.type === "file") {
      dataForm.append(elemento.getAttribute("name"), elemento.files[0]);
    } else {
      dataForm.append(elemento.getAttribute("name"), elemento.value);
    }
  });
  dataForm.delete("files");
  if (checkMethodologyImagesFile(id) && checkMethodologyForm(id)) {
    $.ajax({
      url: Urls.saveMethodology(id),
      method: "POST",
      dataType: "json",
      data: dataForm,
      processData: false,
      contentType: false,
      success: function (data) {
        ok = data.ok;
        if (ok) {
          Swal.fire({
            icon: "success",
            title: "Datos guardados",
            showConfirmButton: false,
            timer: 1000,
          });
        } else {
          Swal.fire({
            icon: "error",
            title: "Oops...",
            text: "No se pudieron guardar los datos!",
          });
        }

        var name = document.getElementById(`methodologyButton-${id}`);
        name.innerText = data.name;
      },
      error: function (jqXHR, textStatus, errorThrown) {
        console.error(errorThrown);
      },
    });
  } else {
    toastr.warning("Se necesitan llenar todos los campos");
  }
}

function checkMethodologyImagesFile(id) {
  var divEspecifico = document.getElementById(`imagesMethodology-${id}`);
  var elementos = divEspecifico.getElementsByTagName("*");

  var elementosFiltrados = [];
  for (var i = 0; i < elementos.length; i++) {
    var elemento = elementos[i];
    if (
      elemento.getAttribute("name") &&
      elemento.getAttribute("name").includes("file-")
    ) {
      elementosFiltrados.push(elemento);
    }
  }

  clear = true;
  elementosFiltrados.forEach(function (elemento) {
    if (
      elemento.nextElementSibling.firstChild.textContent == "Seleccionar Imagen"
    ) {
      clear = false;
    }
  });
  return clear;
}

function checkMethodologyForm(id) {
  var name = document.getElementById(`methodologyName-${id}`);
  var text = document.getElementById(`methodologyText-${id}`);

  clear = true;

  if (
    name.value == null ||
    name.value == "" ||
    text.value == null ||
    text.value == ""
  ) {
    clear = false;
  }

  return clear;
}

function imageMethodologySortable(id) {
  $("#imagesMethodology-" + id).sortable({
    axis: "y",
    handle: ".drag-handle",
    update: function (event) {
      images = event.target.children;
      new_order = [];
      Array.prototype.forEach.call(images, (image) => {
        console.log(image.id.slice(27));
        id = parseInt(image.id.slice(27));
        new_order.push(id);
      });
      $.ajax({
        type: "POST",
        url: Urls.saveMethodology(id),
        data: { new_order: new_order },
      });
    },
  });
}

function deleteImageMethodology(id) {
  images = document.getElementById(`container-methodologyImage-${id}`)
    .parentElement.children;

  new_order = [];
  Array.prototype.forEach.call(images, (image) => {
    id_image = parseInt(image.id.slice(27));
    if (id_image != id) {
      new_order.push(id_image);
    }
  });
  Swal.fire({
    title: "Seguro?!",
    text: "Quieres eliminar esta imagen?",
    icon: "warning",
    confirmButtonText: "Aceptar",
    showCancelButton: true,
    cancelButtonText: "Cancelar",
  }).then((result) => {
    if (result.isConfirmed) {
      $.ajax({
        type: "DELETE",
        url: Urls.methodology_deleteImage(id),
        data: { new_order: new_order },
        success: () => {
          img = document.getElementById("container-methodologyImage-" + id);
          img.remove();
        },
      });
    }
  });
}

function setMethodology(id) {
  analysis_id = window.location.pathname.split("/")[2];

  $.ajax({
    type: "POST",
    url: Urls.analysisReport_save(analysis_id),
    data: { methodology: id },
    success: (data) => {
      reportMethodology = document.getElementById("reportMethodology");
      reportMethodology.value = data.name;
    },
  });
}

function deleteMethodology(id) {
  Swal.fire({
    title: "Seguro?!",
    text: "Quieres eliminar esta metodología?",
    icon: "warning",
    confirmButtonText: "Aceptar",
    showCancelButton: true,
    cancelButtonText: "Cancelar",
  }).then((result) => {
    if (result.isConfirmed) {
      $.ajax({
        type: "DELETE",
        url: Urls.deleteMethodology(id),
        success: (data) => {
          card = document.getElementById(`methodologyCard-${id}`);
          card.remove();
        },
      });
    }
  });
}

$("#methodology_modal").on("show.bs.modal", function (e) {
  analysis_id = window.location.pathname.split("/")[2];
  clearMethodologysHTML();

  $.ajax({
    type: "GET",
    url: Urls.ExamMethodologys(analysis_id),
    success: (data) => {
      console.log(data);
      div = document.getElementById("methodology_table_div");
      data.data.forEach((methodology) => {
        div.insertAdjacentHTML("beforeend", methodologyTemplate(methodology));
        methodology_div = document.getElementById(
          `methodologyButton-${methodology.id}`
        );
        methodology_div.addEventListener("click", () => {
          OpenCard(methodology.id);
        });

        $(`#methodologyText-${methodology.id}`).summernote({
          height: 120,
          lang: "es-ES",
          toolbar: [
            ["style", ["bold", "italic", "underline", "clear"]],
            ["font", ["strikethrough", "superscript", "subscript"]],
            ["color", ["color"]],
          ],
        });

        methodology.images.forEach((image) => {
          image_div = document.getElementById(
            `imagesMethodology-${methodology.id}`
          );
          image_div.insertAdjacentHTML(
            "beforeend",
            methodologyImageTemplate(image)
          );
          if (image.name != "") {
            file_input = document.getElementById(`fileMethodology-${image.id}`);
            file_input.nextElementSibling.innerText = image.name.substring(17);
          }

          if (image.size != "") {
            select_size = document.getElementById(
              `sizeMethodologyImage-${image.id}`
            );
            select_size.value = image.size;
          }
          imageMethodologySortable(image.id);
          $(`#commentImageMethodology-${image.id}`).summernote({
            height: 120,
            lang: "es-ES",
            toolbar: [
              ["style", ["bold", "italic", "underline", "clear"]],
              ["font", ["strikethrough", "superscript", "subscript"]],
              ["color", ["color"]],
            ],
          });
          fileImput_changeName();
        });
      });
    },
  });
});

function clearMethodologysHTML() {
  div = document.getElementById("methodology_table_div");
  div.innerHTML = `<div class="card mb-1">
    <div class="card-header d-flex" id="headingOne" style="justify-content: space-between;">
      <h5 class="mb-0">
        <button class="btn btn-link" id="methodologyButton-null">
          Sin metodología
        </button>
      </h5>
      <button class="btn btn-success" data-dismiss="modal" onclick="setMethodology(null)"><i class="fa fa-check"></i></button>
    </div>
</div>`;
}