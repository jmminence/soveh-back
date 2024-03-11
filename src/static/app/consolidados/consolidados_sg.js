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

function calculateIdentificationAverages(identifications) {
  console.log('Starting calculateIdentificationAverages with identifications:', identifications);

  identifications.forEach((identification, index) => {
    //console.log(`Processing identification ${index}:`, identification);
    const promedioCells = Array.from(document.getElementsByClassName(`${identification.id}-promedio`));
    //console.log(`Found ${promedioCells.length} promedioCells for identification ${identification.id}`);

    promedioCells.forEach((promedio, cellIndex) => {
      //console.log(`Processing promedioCell ${cellIndex} with id ${promedio.id}`);
      const [categoryId, categoryName] = promedio.id.split("-");
      //console.log(`categoryId: ${categoryId}, categoryName: ${categoryName}`);

      const dependencia_prom = Array.from(document.getElementsByClassName(`${categoryId}-${categoryName}`));
      //console.log(`Found ${dependencia_prom.length} dependencia_prom elements for categoryId ${categoryId} and categoryName ${categoryName}`);
      //console.log("dependencias:", dependencia_prom);
      let result_sum = 0;
      let count = 0;

      dependencia_prom.forEach((dependencia, depIndex) => {
        //console.log(`Processing dependencia ${depIndex} with value ${dependencia.value}`);
        const value = parseFloat(dependencia.value);
        if (!isNaN(value)) {
          result_sum += value;
          count++;
        } else {
          //console.log(`Value for dependencia ${depIndex} is NaN, original value: '${dependencia.value}'`);
        }
      });

      if (count > 0) {
        const result_promedio = result_sum / count;
        //console.log(`Setting promedio value for ${promedio.id}, sum: ${result_sum}, count: ${count}, average: ${result_promedio}`);
        promedio.value = result_promedio.toFixed(1);
      } else {
        //console.log(`No valid entries found for ${promedio.id}, skipping average calculation`);
      }
    });
  });

}
function calculateScoreRowSums(identifications) {
  const categorySums = {};

  const excludeCategories = ['Espongeosis', 'Necrosis', 'Degeneración Ballonizante', 'Exfoliación'];

  console.log('Starting calculateScoreRowSums with identifications:', identifications);

  identifications.forEach(identification => {
    console.log('Processing identification:', identification);
    const promedioCells = Array.from(document.getElementsByClassName(`${identification.id}-promedio`));
    console.log(`Found ${promedioCells.length} promedioCells for identification ${identification.id}`);


    promedioCells.forEach(promedio => {
      const [categoryId, categoryName] = promedio.id.split("-");
      // Skip the iteration if the category should be excluded
      if (excludeCategories.includes(categoryName)) {
        console.log(`Skipping excluded category: ${categoryName}`);
        return; // Continue to the next iteration
      }
      const value = parseFloat(promedio.value);
      console.log(`Processing promedioCell with categoryId: ${categoryId}, value: ${value}`);


      if (!isNaN(value)) {
        if (!categorySums[categoryId]) {
          categorySums[categoryId] = 0;
        }
        categorySums[categoryId] += value;
      } else {
        console.log(`Value is NaN for promedioCell with categoryId: ${categoryId}`);
      }
    });
  });

  console.log('categorySums:', categorySums);

  // Update the DOM for each category's score_row with the sum
  Object.keys(categorySums).forEach(categoryId => {
    //(categorySums)
    const sum = categorySums[categoryId];
    const scoreRow = document.getElementsByClassName(`${categoryId}-score_prom`)[0];
    console.log(`Updating scoreRow for categoryId: ${categoryId}, sum: ${sum}`);

    if (scoreRow) {
      scoreRow.value = sum.toFixed(1);
    } else {
      console.error(`scoreRow not found for categoryId: ${categoryId}`);
    }
  });
}function calculateCenterNameAverages(identifications) {
  const centerAverages = {};
  const center_name = document.querySelector('[data-center]').getAttribute('data-center');
  let totalSumOfAverages = 0; // Initialize a variable to hold the sum of all averages
  // Define an array of categories to exclude from the sum
  const excludeCategories = ['Espongeosis', 'Necrosis', 'Degeneración Ballonizante', 'Exfoliación'];

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

  Object.keys(centerAverages).forEach(categoryName => {
    const { sum, count } = centerAverages[categoryName];
    if (count > 0) {
      const average = (sum / count).toFixed(1);
      // Check if the category is not in the list of excluded categories before adding to the total sum
      if (!excludeCategories.includes(categoryName)) {
        totalSumOfAverages += parseFloat(average); // Add each average to the total sum
      }
      const centerAverageCell = document.querySelector(`input[data-center='${center_name}'][class*='${categoryName}']`);
      if (centerAverageCell) {
        centerAverageCell.value = average;
      }
    }
  });

  // Update the designated input field with the total sum of averages
  const totalAveragesInput = document.getElementById('center-averages-sum');
  if (totalAveragesInput) {
    totalAveragesInput.value = totalSumOfAverages.toFixed(1);
  }
}
function calculateAveragesAC(identifications) {  // AC = Anormalidades Celular
  identifications.forEach(identification => {
    // Calculate average for 'Anormalidades Celulares'
    const anormalidadesCells = Array.from(document.getElementsByClassName(`${identification.id}-Anormalidades celulares`));
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
    const anormalidadesAverageCell = document.getElementById(`${identification.id}-Anormalidades celulares-promedio`);
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
   const updatedAnormalidades = {}; // Initialize the object

  // Iterate through the sampleexamresults array
  sampleexamresults.forEach(sampleexamresult => {
    const { value, sample_id, result } = sampleexamresult;
    //console.log(`Processing sample_id: ${sample_id}, result: ${result}, value: ${value}`); // Log for debugging
    // Check if the result is one of the excluded values
    if (['Espongeosis', 'Necrosis', 'Degeneración Ballonizante', 'Exfoliación'].includes(result)) {
      // Update the highest excluded value for the corresponding sample_id
      highestExcludedValue[sample_id] = Math.max(highestExcludedValue[sample_id] || 0, value);
      return;
    }

    // If the result is 'Anormalidades Celulares', add the highest excluded value to it
    if (result === 'Anormalidades celulares') {
      //console.log("Anormalidad celular")
      // Update the value attribute of the input for 'Anormalidades Celulares'
      const anormalidadesCelularesInput = document.getElementById(`${sample_id}-Anormalidades celulares`);
      //console.log("Input AC :",anormalidadesCelularesInput)
      if (anormalidadesCelularesInput) {
        anormalidadesCelularesInput.value =  highestExcludedValue[sample_id];
        //console.log("Valor AC: ",anormalidadesCelularesInput.value)
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
    'Anormalidades celulares',
    'Edema lamelar',
    'Inflamación',
    'CGE',
    'Hidrópica',
    'Congestión',
    'Trombosis',
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

    categoryClass = category;
    //console.log(`Using class selector: ${categoryClass}`);

    // Select all input cells for the category, excluding percentage cells
    const inputCellsSelector = `input[class*="${categoryClass}"]:not([data-center])`;
    //console.log(`Using input cells selector: ${inputCellsSelector}`);

    let inputCells = document.querySelectorAll(inputCellsSelector);
    //console.log("inputCells: ", inputCells)

      // Filter out elements with class ending in '-porcentaje' using a more specific check
      inputCells = Array.from(inputCells).filter(cell => {
        // Check each class in the element's class list for a '-porcentaje' suffix
        return Array.from(cell.classList).every(className => !className.endsWith('-porcentaje'));
      });
    //console.log(`Filtered inputCells: `, inputCells);
    //console.log(`Found ${inputCells.length} input cells for category: ${category}`);
    let nonZeroCount = 0;
    inputCells.forEach(cell => {
      const value = parseFloat(cell.value);
      if (value > 0) {
        nonZeroCount++;
      }
    });

    //console.log(`Non-zero count for ${category}: ${nonZeroCount}`);

    // Calculate the percentage of non-zero cells
    const percentage = inputCells.length > 0 ? Math.round((nonZeroCount / inputCells.length) * 100) : 0;

    //console.log(`Percentage for ${category}: ${percentage.toFixed(2)}%`);

  // Update the corresponding percentage cell
    const percentageCellSelector = `input[class*="${categoryClass}-porcentaje"]`;
    const percentageCell = document.querySelector(percentageCellSelector);
    if (percentageCell) {
      percentageCell.value = percentage;
      //console.log(`Updated percentage cell for ${category} with value: ${percentage.toFixed(2)}`);
      percentageCell.value = percentage + '%';
      if (percentage <= 0) {
        percentageCell.value = "0%"; // Ensure two decimal places for zero
      }
    } else {
      console.error(`Percentage cell for ${category} not found using selector: ${percentageCellSelector}`);
    }
  });
}
