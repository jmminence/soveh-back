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
        }).then(function () {
          // Refresh the page after 1000 milliseconds (1 second)
          location.reload();
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


// function calculateAnomaliasCelulares() {
//   // Get all elements with IDs matching the pattern
//   var espongeosisValue = parseInt(document.querySelector('input[id$="-Espongeosis"]').value);
//   var necrosisValue = parseInt(document.querySelector('input[id$="-Necrosis"]').value);
//   var degeneracionValue = parseInt(document.querySelector('input[id$="-Degeneración Ballonizante"]').value);
//   var exfoliacionValue = parseInt(document.querySelector('input[id$="-Exfoliación"]').value);

//   console.log(espongeosisValue, necrosisValue, degeneracionValue, exfoliacionValue)

//   // Find the maximum value and cap it at 3
//   var maxValue = Math.min(Math.max(espongeosisValue, necrosisValue, degeneracionValue, exfoliacionValue), 3);

//   // Set the calculated value for Anomalias celulares

//   var AnormalidadesCelulares = document.querySelector('input[id$="-Anormalidades celulares"]');
//   console.log("inputAC:",AnormalidadesCelulares);

//   AnormalidadesCelulares.value = maxValue;
//   console.log("inputACVA):",AnormalidadesCelulares.value)
// }


function promedio_identifications(identifications) {
  identifications.forEach(identification => {
    // console.log("ID",identifications); //cages con ids
    const identification_promedios = Array.from(document.getElementsByClassName(`${identification.id}-promedio`));
    // console.log(identification_promedios);
    let totalSum = 0;
    // let totalCount = 0;
    identification_promedios.forEach(identification_promedio => {
    // console.log(identification_promedio);
    const result_prom = identification_promedio.id.split("-");
    // console.log(result_prom);
    const dependencia_prom = Array.from(document.getElementsByClassName(`${result_prom[0]}-${result_prom[1]}`));
    // console.log("dep_prom",result_prom);
    const result_sum = dependencia_prom.reduce((sum, dependencia) => sum + parseInt(dependencia.value), 0);
    // console.log(result_sum);
    const result_promedio = Math.ceil(result_sum / dependencia_prom.length * 10) / 10;
    // console.log("res_prom",result_promedio);
    identification_promedio.value = result_promedio.toFixed(1);
    // console.log(identification_promedio.value);
    totalSum += parseFloat(identification_promedio.value);
    // totalCount++;

    });

    const overallAverage = totalSum;
    // console.log("Overall Average for ID", identification.id, ":", overallAverage.toFixed(1));

    // Set to the score_prom of proms
    var score_row = document.getElementsByClassName(`form-control ${identification.id}-score_prom`)[0];
    // console.log(score_row)
    score_row.value = overallAverage.toFixed(1);

    // console.log(score_row.value);
  });
}



function promedio_cages(sampleexamresults) {
  // Create an object to store the sum of values for each sample_id
  const sumBySampleId = {};

   // Create an object to store the highest value among excluded results
   const highestExcludedValue = {};

  // Iterate through the sampleexamresults array
  sampleexamresults.forEach(sampleexamresult => {
    const { value, sample_id, result } = sampleexamresult;
    // Check if the result is one of the excluded values
    if (['Espongeosis', 'Necrosis', 'Degeneración Ballonizante', 'Exfoliación'].includes(result)) {
      // Update the highest excluded value for the corresponding sample_id
      highestExcludedValue[sample_id] = Math.max(highestExcludedValue[sample_id] || 0, value);
      return;
    }

    // If the result is 'Anormalidades Celulares', add the highest excluded value to it
    if (result === 'Anormalidades Celulares') {
      value += highestExcludedValue[sample_id] || 0;
      // Update the value attribute of the input for 'Anormalidades Celulares'
      const anormalidadesCelularesInput = document.getElementById(`${sample_id}-Anormalidades-celulares`);
      if (anormalidadesCelularesInput) {
        anormalidadesCelularesInput.value = value;
      }
    }

    // If sumBySampleId does not have an entry for the current sample_id, initialize it with 0
    sumBySampleId[sample_id] = (sumBySampleId[sample_id] || 0) + value;
  });

  // Iterate through the unique sample_ids and update corresponding HTML input
  Object.keys(sumBySampleId).forEach(sample_id => {
    const sumValue = sumBySampleId[sample_id];

    // Update the value attribute of the input for the corresponding sample_id
    const inputElement = document.getElementById(`${sample_id}-Score-prom-cage`);
    if (inputElement) {
      inputElement.value = sumValue;
    }
  });
}


// function promedio_cages(sampleexamresults) {
//   // Create an object to store the sum of values for each sample_id
//   const sumBySampleId = {};

//   // Iterate through the sampleexamresults array
//   sampleexamresults.forEach(sampleexamresult => {
//     const { value, sample_id } = sampleexamresult;
//     // console.log("sampleexm",sampleexamresult)

//     // If sumBySampleId does not have an entry for the current sample_id, initialize it with 0
//     sumBySampleId[sample_id] = (sumBySampleId[sample_id] || 0) + value;
//   });
//   // console.log("saidarray",sumBySampleId)

//   // Iterate through the unique sample_ids and update corresponding HTML input
//   Object.keys(sumBySampleId).forEach(sample_id => {
//     // console.log("sample ID",sample_id)
//     const sumValue = sumBySampleId[sample_id];
//     // console.log("sumbys:",sumBySampleId[sample_id])

//     // Update HTML input with the sumValue for the corresponding sample_id
//     const inputElement = document.getElementById(`${sample_id}-Score-prom-cage`);
//     if (inputElement) {
//       inputElement.value = sumValue;
//     }
//   });
// }
