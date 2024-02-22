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

// paso 1 crear funcion para sacar promedio
//paso 2 ejecutar la funcion cuando se carga la pagina y cuando se cambia el valor de los input