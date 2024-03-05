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


// function calculateAverages(identifications) {
//   // Iterate over each identification
//   identifications.forEach(identification => {

//     // Get all elements with the class `${identification.id}-promedio`
//     const promedios = Array.from(document.getElementsByClassName(`${identification.id}-promedio`));

//     // Initialize a variable to store the sum of all calculated averages
//     let totalSum = 0;
//     let cageCount = 0;
//     let sumAcc = 0; // Inicializa varirable para ir acumulando promedios

//     // Iterate over each element with the class `${identification.id}-promedio`
//     promedios.forEach(promedio => {

//       // Split the id of the current element
//       const result_prom = promedio.id.split("-");
//       console.log("split", result_prom);

//       // Get all elements with the class `${result_prom[0]}-${result_prom[1]}`
//       const dependencia_prom = Array.from(document.getElementsByClassName(`${result_prom[0]}-${result_prom[1]}`));
//       console.log("dependencia_prom", dependencia_prom);

//       // Calculate the sum of values of elements with the class `${result_prom[0]}-${result_prom[1]}`
//       const result_sum = dependencia_prom.reduce((sum, dependencia) => sum + parseInt(dependencia.value), 0);

//       // Calculate the average and round it to one decimal place
//       const result_promedio = Math.ceil(result_sum / dependencia_prom.length * 10) / 10;

//       console.log("promedio 1:", promedio);

//       // Set the value of the current element with the calculated average
//       promedio.value = result_promedio.toFixed(1);

//       // Accumulate the current average to the total sum
//       totalSum += parseFloat(promedio.value);
//       console.log("promedio", promedio.value);
//       cageCount += 1
//     });

//     // Calculate the cage average
//     const overallAverage = totalSum;

//     // Set the value of the first element with the class `${identification.id}-score_prom` to the overall average
//     var score_row = document.getElementsByClassName(`${identification.id}-score_prom`)[0];
//     score_row.value = overallAverage.toFixed(1);
//     console.log(overallAverage);
//   });
// }

function calculateAverages(identifications) {
  // Create an object to store the category averages
  const categoryAverages = {};

  // Iterate over each identification
  identifications.forEach(identification => {

    // Get all elements with the class `${identification.id}-promedio`
    const promedios = Array.from(document.getElementsByClassName(`${identification.id}-promedio`));

    // Iterate over each element with the class `${identification.id}-promedio`
    promedios.forEach(promedio => {

      // Split the id of the current element
      const result_prom = promedio.id.split("-");

      // Get the category name
      const categoryName = result_prom[0];

      // Get all elements with the class `${categoryName}-${result_prom[1]}`
      const dependencia_prom = Array.from(document.getElementsByClassName(`${categoryName}-${result_prom[1]}`));
      console.log(dependencia_prom)

      // Calculate the sum of values of elements with the class `${categoryName}-${result_prom[1]}`
      const result_sum = dependencia_prom.reduce((sum, dependencia) => sum + parseInt(dependencia.value), 0);

      // Calculate the average and round it to one decimal place
      const result_promedio = Math.ceil(result_sum / dependencia_prom.length * 10) / 10;

      // Set the value of the current element with the calculated average
      promedio.value = result_promedio.toFixed(1);

      // Update or initialize the category average in the object
      if (categoryAverages[categoryName]) {
        categoryAverages[categoryName].sum += result_promedio;
        categoryAverages[categoryName].count += 1;
      } else {
        categoryAverages[categoryName] = {
          sum: result_promedio,
          count: 1
        };
      }
    });
  });

    // Calculate and set the overall category averages
    let totalOverallSum = 0;
    let totalOverallCount = 0;

  // Calculate and set the overall category averages
Object.keys(categoryAverages).forEach(categoryName => {
  console.log(categoryAverages)
  const categoryData = categoryAverages[categoryName];

  // Check if the count is greater than 0 to avoid division by zero
  if (categoryData.count > 0) {
    const overallAverage = categoryData.sum / categoryData.count;

    // Set the value of the first element with the class `${categoryName}-score_prom` to the overall average
    const score_row = document.getElementsByClassName(`${categoryName}-score_prom`)[0];
    score_row.value = overallAverage.toFixed(1);

    totalOverallSum += overallAverage;
    totalOverallCount += 1;
    console.log(overallAverage.value.center)
    console.log(totalOverallSum, totalOverallCount)
  }
});

// Check if totalOverallCount is greater than 0 to avoid division by zero
if (totalOverallCount > 0) {
  // Calculate and set the overall average
  const centerAverage = totalOverallSum / totalOverallCount;
  const center = document.getElementsByClassName(`${value.center}-${categoryName}`)[0];
  console.log(center);
  console.log("Overall Average:", centerAverage.toFixed(1));
} else {
  console.log("Overall Average cannot be calculated due to division by zero.");
}
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
      // console.log(sampleexamresult)
      // console.log("hec",highestExcludedValue[sample_id])
      return;
    }
    // If the result is 'Anormalidades Celulares', add the highest excluded value to it
    if (result === 'Anormalidades celulares') {
      // Update the value attribute of the input for 'Anormalidades Celulares'
      const anormalidadesCelularesInput = document.getElementById(`${sample_id}-Anormalidades celulares`);
      if (anormalidadesCelularesInput) {
        anormalidadesCelularesInput.value =  highestExcludedValue[sample_id];
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

