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
    try {
      $.ajax({
        type: "POST",
        url: Urls.save_consolidado_sg(id),
        data: {
          data: data,
        },
        dataType: "json",
        success: function(response) {
          // Handle success
          Swal.fire({
            icon: "success",
            title: "Datos guardados",
            showConfirmButton: false,
            timer: 1000,
          }).then(function () {
            location.reload();
          });
        },
        error: function(xhr, status, error) {
          // Handle error
          console.error("Save error:", error);
          Swal.fire({
            icon: "error",
            title: "Oops...",
            text: "No se pudieron guardar los datos!",
          });
        }
      });
    } catch (error) {
      console.error("Unexpected error:", error);
      // Optionally, display an error message to the user
    }
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

// Add a new object to track if 'Anormalidades Celulares' has been updated
const updatedAnormalidades = {};
/*function calculateAverages(identifications) {
  const categoryAverages = {};
  const centerAverages = {};

  identifications.forEach(identification => {
    const promedioCells = Array.from(document.getElementsByClassName(`${identification.id}-promedio`));

    promedioCells.forEach(promedio => {
      const [categoryId, categoryName] = promedio.id.split("-");
      const centerId = promedio.classList.contains(`${identification.center}-promedio`) ? identification.center : null;
      console.log("centerId",centerId)

      const dependencia_prom = Array.from(document.getElementsByClassName(`${categoryId}-${categoryName}`));
      let result_sum = 0;
      let count = 0;

      dependencia_prom.forEach(dependencia => {
        const value = parseInt(dependencia.value, 10);
        if (!isNaN(value)) {
          result_sum += value;
          count++;
        }
      });

      if (count > 0) {
        const result_promedio = result_sum / count;
        promedio.value = result_promedio.toFixed(1);
        console.log("pr",result_promedio)

        if (!categoryAverages[categoryId]) {
          categoryAverages[categoryId] = { sum: 0, count: 0 };
        }
        categoryAverages[categoryId].sum += result_promedio;
        categoryAverages[categoryId].count += 1;
      }
    });
  });

  // Calculate overall averages for each category
  Object.keys(categoryAverages).forEach(categoryId => {
    const { sum } = categoryAverages[categoryId];
    const score_row = document.getElementsByClassName(`${categoryId}-score_prom`)[0];
    if (score_row) {
      score_row.value = sum.toFixed(1); // Display the sum instead of the average
    }
  });
}*/

function calculateIdentificationAverages(identifications) {
  identifications.forEach(identification => {
    const promedioCells = Array.from(document.getElementsByClassName(`${identification.id}-promedio`));
    promedioCells.forEach(promedio => {
      const [categoryId, categoryName] = promedio.id.split("-");
      const dependencia_prom = Array.from(document.getElementsByClassName(`${categoryId}-${categoryName}`));
      let result_sum = 0;
      let count = 0;

      dependencia_prom.forEach(dependencia => {
        const value = parseFloat(dependencia.value);
        if (!isNaN(value)) {
          result_sum += value;
          count++;
        }
      });

      if (count > 0) {
        const result_promedio = result_sum / count;
        promedio.value = result_promedio.toFixed(1);
      }
    });
  });
}

function calculateScoreRowSums(identifications) {
  const categorySums = {};

  identifications.forEach(identification => {
    //console.log(identification);
    const promedioCells = Array.from(document.getElementsByClassName(`${identification.id}-promedio`));
    promedioCells.forEach(promedio => {
      const [categoryId, _] = promedio.id.split("-");
      const value = parseFloat(promedio.value);
      if (!isNaN(value)) {
        if (!categorySums[categoryId]) {
          categorySums[categoryId] = 0;
        }
        categorySums[categoryId] += value;
      }
    });
  });

  // Update the DOM for each category's score_row with the sum
  Object.keys(categorySums).forEach(categoryId => {
    //console.log(categorySums)
    const sum = categorySums[categoryId];
    const scoreRow = document.getElementsByClassName(`${categoryId}-score_prom`)[0];
    //console.log(scoreRow);
    if (scoreRow) {
      scoreRow.value = sum.toFixed(1);
    }
  });
}

function calculateCenterNameAverages(identifications) {
  const centerAverages = {};
  const center_name = document.querySelector('[data-center]').getAttribute('data-center');
  //console.log(center_name);

  // Assuming calculateIdentificationAverages has been called first
  identifications.forEach(identification => {
    const promedioCells = Array.from(document.getElementsByClassName(`${identification.id}-promedio`));
    promedioCells.forEach(promedio => {
      const categoryName = promedio.id.split("-")[1];
      if (!centerAverages[categoryName]) {
        centerAverages[categoryName] = { sum: 0, count: 0 };
      }
      const value = parseFloat(promedio.value);
      if (!isNaN(value)) {
        centerAverages[categoryName].sum += value;
        centerAverages[categoryName].count++;
      }
    });
  });
  // Calculate and update the DOM for Center Name Average
  Object.keys(centerAverages).forEach(categoryName => {
    const { sum, count } = centerAverages[categoryName];
    if (count > 0) {
      const average = (sum / count).toFixed(1);
      const centerAverageCell = document.querySelector(`input[data-center='${center_name}'][class*='${categoryName}']`);
      if (centerAverageCell) {
        centerAverageCell.value = average;
      }
    }
  });
}

function calculateAveragesAC(identifications) {  // AC = Anormalidades Celular
  identifications.forEach(identification => {
    // Calculate average for 'Anormalidades Celulares'
    const anormalidadesCells = Array.from(document.getElementsByClassName(`${identification.id}-Anormalidades-Celulares`));
    let anormalidadesTotal = 0;
    let anormalidadesCount = 0;

    anormalidadesCells.forEach(cell => {
      const value = parseFloat(cell.value);
      if (!isNaN(value)) {
        anormalidadesTotal += value;
        anormalidadesCount++;
      }
    });

    const anormalidadesAverage = anormalidadesCount > 0 ? (anormalidadesTotal / anormalidadesCount).toFixed(1) : '0';
    const anormalidadesAverageCell = document.getElementById(`${identification.id}-Anormalidades-Celulares-promedio`);
    if (anormalidadesAverageCell) {
      anormalidadesAverageCell.value = anormalidadesAverage;
    }
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
    if (result === 'Anormalidades-Celulares') {
      // Update the value attribute of the input for 'Anormalidades Celulares'
      const anormalidadesCelularesInput = document.getElementById(`${sample_id}-Anormalidades-Celulares`);

      if (anormalidadesCelularesInput) {
        anormalidadesCelularesInput.value =  highestExcludedValue[sample_id];
        updatedAnormalidades[sample_id] = true;
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

function calculatePromedioCellsPercentage() {
  // Define the categories based on the provided HTML structure
  const categories = [ //considerar para después protozoos
    'Hiperplasia lamelar',
    'Fusión lamelar',
    'Espongeosis',
    'Necrosis',
    'Degeneración Ballonizante',
    'Exfoliación',
    'Anormalidades Celulares',
    'Edema lamelar',
    'Inflamación',
    'CGE',
    'Deg Hidrópica',
    'Congestión',
    'Telangiectasia Trombosis',
    'Hemorragia',
    'optionmar',
    'Otros Parasitos',
    'Zooplancton',
    'Microalgas',
    'Tenocibiboculum',
    'Otras Bacterias',
    // Add other categories as needed
  ];
  categories.forEach(category => {
    // Replace spaces with hyphens and escape periods for the class selector
    const categoryClass = category.replace(/\s+/g, '-');
    console.log("Category", categoryClass)
    // Select all input cells for the category, excluding percentage cells
    const inputCellsSelector = `input[class*="${categoryClass}"]:not(.${categoryClass}-porcentaje):not([data-center])`;
    console.log(inputCellsSelector);
    const inputCells = document.querySelectorAll(inputCellsSelector);
    console.log("********************************");
    console.log(inputCells);

    let nonZeroCount = 0;
    inputCells.forEach(cell => {
      const value = parseFloat(cell.value);
      if (value > 0) {
        nonZeroCount++;
      }
    });

    // Calculate the percentage of non-zero cells
    const percentage = nonZeroCount > 0 ? (nonZeroCount / inputCells.length) * 100 : 0;

  // Update the corresponding percentage cell
    const percentageCellSelector = `input[class*="${categoryClass}-porcentaje"]`;
    const percentageCell = document.querySelector(percentageCellSelector);
    if (percentageCell) {
      percentageCell.value = percentage.toFixed(2);
      if (percentage <= 0) {
        percentageCell.value = "0.00"; // Ensure two decimal places for zero
      }
    } else {
      console.error(`Percentage cell for ${category} not found using selector: ${percentageCellSelector}`);
    }
  });
}


function setupAnormalidadesCelularesInputListener() {
  const inputElement = document.querySelector('.Anormalidades-Celulares-porcentaje');
  if (!inputElement) {
      console.error('Anormalidades Celulares input not found');
      return;
  }
  inputElement.addEventListener('input', function(event) {
      console.log(`The value of Anormalidades Celulares was changed to: ${event.target.value}`);
      // Perform any additional logic here, such as resetting the value if needed
  });
}
