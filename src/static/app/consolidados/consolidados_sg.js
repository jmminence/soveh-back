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



function load(sampleexamresults, result_name, waterType) {


  var select_result = document.getElementsByName("mar_opcional")[0];

  // Check if the select element exists before setting its value
  if (select_result) {
    select_result.value = result_name;
  } else {
    console.warn("Select element 'mar_opcional' not found.");
  }

  sampleexamresults.forEach(function (sampleexamresult) {
    console.log("sampleexamresult",sampleexamresult);
    console.log("sampleexamresults_sampleid",sampleexamresult.sample_id);
    var input = document.getElementById(`${sampleexamresult.sample_id}-${sampleexamresult.result}`);
    console.log("input", input);
    //console.log("Input mar_opcional: " + input)
    if(input==null){
      input = document.getElementsByName(`${sampleexamresult.sample_id}-optionmar`)[0];
      ("if input null", input)
      //console.log("Input OptionMar: " + input)
    }
    input.value = sampleexamresult.value;
  });
  }


function calculateIdentificationAverages(identifications) {
  //console.log('Starting calculateIdentificationAverages with identifications:', identifications);

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

let myChart; // Declare myChart at a higher scope so it can be accessed by generateChart

let myBoxChartInstance = null;

function generateChartProms(data, labels, centerAverage, centerName) {
  // Log the data to ensure it's correct
  //console.log('Data:', data);
  //console.log('Labels:', labels);
  //console.log('Center Average:', centerAverage);

  const ctx = document.getElementById('myChart').getContext('2d');

  // Define your threshold values
  const threshold1 = 4;
  const threshold2 = 7;
  const threshold3 = 10;

  // Convert 'data' to an array if it's not already
  if (!Array.isArray(data)) {
    data = Object.values(data);
  }

  // Add the center average to the data array
  data.push(centerAverage);

  // Add a label for the center average
  labels.push(centerName);

  // Define an array of colors for the bars
  const barColors = data.map((_, index) => index === data.length - 1 ? 'rgba(122, 111, 233, 0.4)' : 'rgba(54, 162, 235, 0.2)');

  // Chart options
  const chartOptions = {
    plugins: {
      datalabels: {
        display: true, // Ensure that datalabels are displayed
        color: '#444', // Set the color of the datalabels
        anchor: 'end', // Anchor the labels to the end of the bars
        align: 'top', // Align the labels to the top of the bars
        formatter: (value) => value.toFixed(1)
      },
      legend: {
        display: true,
        labels: {
          color: 'rgb(5, 99, 32)'
        }
      },
      tooltip: {
        enabled: true
      },
      annotation: {
        annotations: {
          text1: {
            type: 'label',
            xValue: 'GRAVEDAD', // Adjust this based on your x-axis scale
            yValue: (threshold1) / 2, // Position it between threshold2 and threshold3
            content: 'NO SIGNIFICATIVO', // The text you want to display
            backgroundColor: 'rgba(0,0,0,0)', // Transparent background
            color: 'black', // Text color
            font: {
              size: 12
            },
            xPadding: 6,
            yPadding: 6,
            position: 'center',
            textAlign: 'center'
          },
          text2: {
            type: 'label',
            xValue: 'GRAVEDAD', // You might need to adjust this based on your x-axis scale
            yValue: threshold1 + 0.2, // Position it between threshold1 and threshold2
            content: 'LEVE', // The text you want to display
            backgroundColor: 'rgba(0,0,0,0)', // Transparent background
            color: 'black', // Text color
            font: {
              size: 12
            },
            xPadding: 6,
            yPadding: 6,
            position: 'center',
            textAlign: 'center'
          },
          text3: {
            type: 'label',
            xValue: 'GRAVEDAD', // Adjust this based on your x-axis scale
            yValue: threshold2 + 0.2, // Position it between threshold2 and threshold3
            content: 'MODERADO', // The text you want to display
            backgroundColor: 'rgba(0,0,0,0)', // Transparent background
            color: 'black', // Text color
            font: {
              size: 12
            },
            xPadding: 6,
            yPadding: 6,
            position: 'center',
            textAlign: 'center'
          },
          text4: {
            type: 'label',
            xValue: 'GRAVEDAD', // Adjust this based on your x-axis scale
            yValue: threshold3 + 0.2, // Position it between threshold2 and threshold3
            content: 'SEVERO', // The text you want to display
            backgroundColor: 'rgba(0,0,0,0)', // Transparent background
            color: 'black', // Text color
            font: {
              size: 12
            },
            xPadding: 6,
            yPadding: 6,
            position: 'center',
            textAlign: 'center'
          }
        }
      }
    },
    animation: {
      onComplete: () => {
        const chartInstance = window.myChart;
        const ctx = chartInstance.ctx;
        ctx.font = Chart.helpers.toFont({
          size: 12,
          weight: 'normal',
          family: Chart.defaults.font.family,
        }).string;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';

        // Draw threshold lines
        const yScale = chartInstance.scales.y;
        const xScale = chartInstance.scales.x;
        const chartArea = chartInstance.chartArea;

        // Draw the first threshold line
        ctx.strokeStyle = '#28a745';  // green
        ctx.beginPath();
        let lineY = yScale.getPixelForValue(threshold1);
        ctx.moveTo(chartArea.left, lineY);
        ctx.lineTo(chartArea.right, lineY);
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw the second threshold line
        ctx.strokeStyle = '#ffa500'; // orange
        ctx.beginPath();
        lineY = yScale.getPixelForValue(threshold2);
        ctx.moveTo(chartArea.left, lineY);
        ctx.lineTo(chartArea.right, lineY);
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw the third threshold line
        ctx.strokeStyle =  '#ff0000'// red
        ctx.beginPath();
        lineY = yScale.getPixelForValue(threshold3);
        ctx.moveTo(chartArea.left, lineY);
        ctx.lineTo(chartArea.right, lineY);
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    },
  };


  // Define a beforeDraw plugin directly within the function
  const beforeDrawPlugin = {
    id: 'beforeDrawBackground',
    beforeDraw: (chart) => {
      const ctx = chart.ctx;
      const chartArea = chart.chartArea;
      ctx.save();
      ctx.fillStyle = 'white';
      ctx.fillRect(chartArea.left, chartArea.top, chartArea.right - chartArea.left, chartArea.bottom - chartArea.top);
      ctx.restore();
    }
  };

  // If the chart instance already exists, update its data and labels
  if (window.myChart instanceof Chart) {
    window.myChart.options = chartOptions; // Make sure to update the options
    window.myChart.data.labels = labels;
    window.myChart.data.datasets[0].data = data;
    window.myChart.data.datasets[0].backgroundColor = barColors; // Assign the colors array
    window.myChart.update(); // Don't forget to call update() to render the changes
  } else {
      // If the chart does not exist, create a new instance
      window.myChart = new Chart(ctx, {
          type: 'bar',
          data: {
              labels: labels,
              datasets: [{
                  label: 'Score Promedio de Salud Branquial (0-24)',
                  data: data,
                  backgroundColor: barColors, // Assign the colors array here
                  borderColor: 'rgba(2, 9, 1)',
                  borderWidth: 1
              }]
          },
          options: chartOptions,
          plugins: [beforeDrawPlugin] // Add the beforeDraw plugin here

      });
  }
}

function calculateScoreRowSums(identifications) {

  const categorySums = {};
  const excludeCategories = ['Espongeosis', 'Necrosis', 'Degeneración Ballonizante', 'Exfoliación'];

  //console.log('Starting calculateScoreRowSums with identifications:', identifications);


  identifications.forEach(identification => {
    //console.log('Processing identification:', identification);
    const promedioCells = Array.from(document.getElementsByClassName(`${identification.id}-promedio`));
    //console.log(`Found ${promedioCells.length} promedioCells for identification ${identification.id}`);


    promedioCells.forEach(promedio => {
      const [categoryId, categoryName] = promedio.id.split("-");
      // Skip the iteration if the category should be excluded
      if (excludeCategories.includes(categoryName)) {
        //console.log(`Skipping excluded category: ${categoryName}`);
        return; // Continue to the next iteration
      }
      const value = parseFloat(promedio.value);
      //console.log(`Processing promedioCell with categoryId: ${categoryId}, value: ${value}`);


      if (!isNaN(value)) {
        if (!categorySums[categoryId]) {
          categorySums[categoryId] = 0;
        }
        categorySums[categoryId] += value;
      } else {
        //console.log(`Value is NaN for promedioCell with categoryId: ${categoryId}`);
      }
    });
  });

  //console.log('categorySums:', categorySums);

  // New code to collect score_prom values and labels
  let scoreRowValues = [];
  let labels = [];
  const cageNameElements = document.querySelectorAll('th[data-cage-name]');

  // Iterate over the cageNameElements to collect the names
  cageNameElements.forEach((th) => {
    // Get the cage name from the data-cage-name attribute
    const cageName = th.getAttribute('data-cage-name');
    labels.push(cageName);
  });

  Object.keys(categorySums).forEach(categoryId => {

    const sum = categorySums[categoryId];
    const scoreRow = document.getElementsByClassName(`${categoryId}-score_prom`)[0];
    //console.log(`ScoreRow:`, scoreRow);
    if (scoreRow) {
      scoreRow.value = sum.toFixed(1); // Update the scoreRow value
      scoreRowValues.push(parseFloat(scoreRow.value)); // Collect the value for the chart

    } else {
      console.error(`scoreRow not found for categoryId: ${categoryId}`);
    }
  });


  // Ensure that you have values and labels for each score_prom
  //console.log('Score Prom Values:', scoreRowValues);
  //console.log('Labels:', labels);

  // Now, you have scorePromValues and labels ready to be used in the chart
  // Assuming calculateCenterNameAverages has already been called and the center average is updated in an element with id 'center-averages-sum'
  const centerAverage = parseFloat(document.getElementById('center-averages-sum').value);
  const centerName = document.querySelector('[data-center]').getAttribute('data-center');


  generateChartProms(scoreRowValues, labels, centerAverage, centerName);

}

function calculateCenterNameAverages(identifications) {
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
    // Protozoos / optionmar
    // Hongos / Otros Parasitos
    'Zooplancton',
    'Microalgas',
    // Flavobacterium / Tenocibiboculum
    'Otras Bacterias',
  ];

  // Dynamically add 'optionmar' or 'Protozoos' based on the presence of elements in the document
  const protozoosElements = document.querySelectorAll('.Protozoos-porcentaje');
  const optionmarElements = document.querySelectorAll('.optionmar-porcentaje');
  const HongosElements = document.querySelectorAll('.Hongos-porcentaje');
  const OtrosParsElements = document.querySelectorAll('[class*="Otros Parasitos-porcentaje"]');
  const FlavobacteriumElements = document.querySelectorAll('.Flavobacterium-porcentaje');
  const TenocibiboculumElements = document.querySelectorAll('.Tenocibiboculum-porcentaje');

  console.log("elements",optionmarElements,OtrosParsElements)

  if (protozoosElements.length > 0)
    categories.push('Protozoos');
  if (optionmarElements.length > 0)
    categories.push('optionmar');
  if (HongosElements.length > 0)
    categories.push('Hongos');
  if (OtrosParsElements.length > 0)
    categories.push('Otros Parasitos');
  if (TenocibiboculumElements.length > 0)
    categories.push('Tenocibiboculum');
  if (FlavobacteriumElements.length > 0)
    categories.push('Flavobacterium');


  console.log(categories)
  categories.forEach(category => {

    categoryClass = category;
    //console.log(`Using class selector: ${categoryClass}`);
    //console.log(categoryClass);

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

function promedio_cages() {
  //console.log("Starting promedio_cages function");
  const inputs = document.querySelectorAll('.recalculate-average');
  const valuesBySampleId = {}; // Object to hold arrays of values for each category
  //console.log(`Found ${inputs.length} inputs to process`);

  const sumBySampleId = {};
  const highestExcludedValue = {};
  const updatedAnormalidades = {};

  inputs.forEach(input => {
      const [sample_id, result] = input.id.split('-'); // Split the id to get sample_id and result
      const value = parseFloat(input.value);
      //console.log(`Processing input: sample_id=${sample_id}, result=${result}, value=${value}`);

      if (isNaN(value)) {
        //console.log(`Skipping input due to non-numeric value: ${input.id}`);
        return; // Skip if value is NaN
      }

      // Initialize the array for the category if it doesn't exist
      if (!valuesBySampleId[sample_id]) {
        valuesBySampleId[sample_id] = [];
      }

      // Append the value to the category's array
      valuesBySampleId[sample_id].push(value);



      // Handle excluded results and update the highest excluded value for the sample_id
      if (['Espongeosis', 'Necrosis', 'Degeneración Ballonizante', 'Exfoliación'].includes(result)) {
          highestExcludedValue[sample_id] = Math.max(highestExcludedValue[sample_id] || 0, value);
          //console.log(`Updated highestExcludedValue for ${sample_id}: ${highestExcludedValue[sample_id]}`);
          return;
      }

      // Handle 'Anormalidades celulares' by setting its value to the highest excluded value for the sample_id
      if (result === 'Anormalidades celulares') {
        //console.log("entra a AC")
          const anormalidadesCelularesInput = document.getElementById(`${sample_id}-Anormalidades celulares`);
          if (anormalidadesCelularesInput) {
              anormalidadesCelularesInput.value = highestExcludedValue[sample_id] || 0;
              updatedAnormalidades[sample_id] = true; // Mark as updated
              //console.log(`Updated Anormalidades celulares for ${sample_id}: ${anormalidadesCelularesInput.value}`);
          }
      }

      // Initialize sumBySampleId[sample_id] if it doesn't exist
      if (!sumBySampleId[sample_id]) {
          sumBySampleId[sample_id] = 0;
          //console.log(`Initialized sumBySampleId for ${sample_id}`);
      }

      // Append the value to the category's array
      valuesBySampleId[sample_id].push(value);

      // Add value to sumBySampleId[sample_id] for other results
      sumBySampleId[sample_id] += value;
      //console.log(`Updated sumBySampleId for ${sample_id}: ${sumBySampleId[sample_id]}`);
  });

  // Update the UI based on sumBySampleId f or other results
  Object.keys(sumBySampleId).forEach(sample_id => {
      const inputElement = document.getElementById(`${sample_id}-Score-prom-cage`);
      if (inputElement) {
          inputElement.value = sumBySampleId[sample_id];
         // console.log(`Updated UI for ${sample_id}: ${sumBySampleId[sample_id]}`);
      } else {
          //console.log(`Could not find input element for ${sample_id}-Score-prom-cage`);
      }
  });

}

//---------------------------MixedChart Hallazgos Principales-------------------------------------

function extractDataForMixedChart(identifications) {
  // Define objects to hold the data for each category keyed by cage name
  let hiperplasiaLamelarData = {};
  let fusionLamelarData = {};
  let anormalidadesCelularesData = {};
  let edemaLamelarData = {};
  let cageNames = [];

  // Collect cage names
  const cageNameElements = document.querySelectorAll('th[data-cage-name]');
  cageNameElements.forEach((th) => {
    const cageName = th.getAttribute('data-cage-name');
    cageNames.push(cageName);
    // Initialize the data objects for each cage
    hiperplasiaLamelarData[cageName] = 0;
    fusionLamelarData[cageName] = 0;
    anormalidadesCelularesData[cageName] = 0;
    edemaLamelarData[cageName] = 0;
  });

  // Process each identification to extract the average values
  identifications.forEach(identification => {
    const cageName = identification.cage; // Assuming 'cage' is a property of 'identification'
    const idPrefix = identification.id; // This is the prefix used in the ID of the average cells

    // Use the idPrefix to build the ID for the average inputs and extract their values
    hiperplasiaLamelarData[cageName] = parseFloat(document.getElementById(`${idPrefix}-Hiperplasia lamelar-promedio`).value) || 0;
    fusionLamelarData[cageName] = parseFloat(document.getElementById(`${idPrefix}-Fusión lamelar-promedio`).value) || 0;
    anormalidadesCelularesData[cageName] = parseFloat(document.getElementById(`${idPrefix}-Anormalidades celulares-promedio`).value) || 0;
    edemaLamelarData[cageName] = parseFloat(document.getElementById(`${idPrefix}-Edema lamelar-promedio`).value) || 0;
  });


  // Assuming 'center-averages-sum' is an input element containing the center average valu
  const centerName = document.querySelector('[data-center]').getAttribute('data-center');
  //console.log(centerName);

  // Assuming the center averages are stored with IDs like 'centerName-Hiperplasia lamelar-promedio'
  const categories = ['Hiperplasia lamelar', 'Fusión lamelar', 'Anormalidades celulares', 'Edema lamelar'];
  const centerAverages = categories.map(category => {
    //const centerAverageElement = document.getElementById(`${centerName}'-'${category}`);


    const centerAverageElement = document.querySelector(`input[data-center='${centerName}'][class*='${category}']`);
    //console.log(centerAverageElement);
    return centerAverageElement ? parseFloat(centerAverageElement.value) || 0 : 0;
  });
// Now you have the center averages for each category, you can generate the chart
  generateMixedChart(cageNames, hiperplasiaLamelarData, fusionLamelarData, anormalidadesCelularesData, edemaLamelarData, centerAverages, centerName);

}

function generateMixedChart(cageNames, hiperplasiaLamelarData, fusionLamelarData, anormalidadesCelularesData, edemaLamelarData, centerAverages, centerName) {
  const ctx = document.getElementById('myMixedChart').getContext('2d');

  // Check if the chart instance already exists
  if (window.myMixedChart instanceof Chart) {
    window.myMixedChart.destroy(); // Destroy the existing chart
  }

  // Create datasets for the bars
  const barDatasets = cageNames.map((cageName, index) => ({
    type: 'bar',
    label: cageName,
    data: [
      hiperplasiaLamelarData[cageName],
      fusionLamelarData[cageName],
      anormalidadesCelularesData[cageName],
      edemaLamelarData[cageName]
    ],
    backgroundColor: `rgba(${255 - index * 50}, ${99 + index * 50}, ${132 + index * 50}, 0.2)`,
    borderColor: `rgba(${255 - index * 50}, ${99 + index * 50}, ${132 + index * 50}, 1)`,
    borderWidth: 1
  }));

  // Create a dataset for the line using the center averages for each category
  const lineDataset = {
    type: 'line',
    label: centerName,
    data: centerAverages, // Use the center averages array
    backgroundColor: 'rgba(255, 159, 64, 0.2)',
    borderColor: 'rgba(255, 159, 64, 1)',
    borderWidth: 3,
    fill: false
  };

  // Combine the bar datasets with the line dataset
  const mixedDatasets = [...barDatasets, lineDataset];

  // Create a new chart instance
  window.myMixedChart = new Chart(ctx, {
    data: {
      labels: ['Hiperplasia Lamelar', 'Fusión Lamelar', 'Anormalidades Celulares', 'Edema Lamelar'],
      datasets: mixedDatasets
    },
    options: {
      scales: {
        y: {
          beginAtZero: true
        }
      },
      plugins: {
        tooltip: {
          mode: 'index',
          intersect: false
        }
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      }
    }
  });

  createDataTableMixedChart(cageNames, hiperplasiaLamelarData, fusionLamelarData, anormalidadesCelularesData, edemaLamelarData, centerAverages, centerName);
}

// Function to create a data table below the chart
function createDataTableMixedChart(cageNames, hiperplasiaLamelarData, fusionLamelarData, anormalidadesCelularesData, edemaLamelarData, centerAverages, centerName) {
  const categories = ['Hiperplasia Lamelar', 'Fusión Lamelar', 'Anormalidades Celulares', 'Edema Lamelar'];
  let table = '<table border="1">';
  table += '<tr><th>Cage/Center</th>';
  categories.forEach(category => {
    table += `<th>${category}</th>`;
  });
  table += '</tr>';

  // Add rows for each cage
  cageNames.forEach(cageName => {
    table += `<tr><td>${cageName}</td>`;
    table += `<td>${hiperplasiaLamelarData[cageName]}</td>`;
    table += `<td>${fusionLamelarData[cageName]}</td>`;
    table += `<td>${anormalidadesCelularesData[cageName]}</td>`;
    table += `<td>${edemaLamelarData[cageName]}</td></tr>`;
  });

  // Add a row for the center averages
  table += `<tr><td>${centerName}</td>`;
  centerAverages.forEach(average => {
    table += `<td>${average}</td>`;
  });
  table += '</tr>';

  table += '</table>';

  // Append the table to a div or any other container element
  document.getElementById('chartDataTable').innerHTML = table;
}

//---------------------------MixedChart Criterio Auxiliar-------------------------------------

function extractDataForMixedChart2(identifications, waterType) {
  // Define objects to hold the data for each category keyed by cage name

  let inflamacion = {};
  let cge = {};
  let degHidropica = {};
  let congestion = {};
  let telangiectasiaTrombosis = {};
  let hemorragia = {};
  //let optionmar = {};
  let protozoosOrMar = {};
  let hongosOrOtrosPars = {};
  let zooplancton = {};
  let microalgas = {};
  let flavoOrTeno = {};
  let otrasBacterias = {};
  let cageNames = [];

  // Collect cage names
  const cageNameElements = document.querySelectorAll('th[data-cage-name]');



  cageNameElements.forEach((th) => {
    const cageName = th.getAttribute('data-cage-name');
    cageNames.push(cageName);
    // Initialize the data objects for each cage
    inflamacion[cageName] = 0;
    cge[cageName] = 0;
    degHidropica[cageName] = 0;
    congestion[cageName] = 0;
    telangiectasiaTrombosis[cageName] = 0;
    hemorragia[cageName] = 0;
    //optionmar[cageName] = 0;
    protozoosOrMar[cageName] = 0;
    hongosOrOtrosPars[cageName] = 0;
    zooplancton[cageName] = 0;
    microalgas[cageName] = 0;
    flavoOrTeno[cageName] = 0;
    otrasBacterias[cageName] = 0;
  });


  // Process each identification to extract the average values
  identifications.forEach(identification => {
    const cageName = identification.cage; // Assuming 'cage' is a property of 'identification'
    const idPrefix = identification.id; // This is the prefix used in the ID of the average cells


    // Adjusted to include conditional logic for water type
    const protozoosOrMarId = waterType === 'Dulce' ? `${idPrefix}-Protozoos-promedio` : `${idPrefix}-optionmar-promedio`;
    const hongosOrOtrosParsId = waterType === 'Dulce' ? `${idPrefix}-Hongos-promedio` : `${idPrefix}-Otros Parasitos-promedio`;
    const flavoOrTenoId = waterType === 'Dulce' ? `${idPrefix}-Flavobacterium-promedio` : `${idPrefix}-Tenocibiboculum-promedio`;



    // Use the idPrefix to build the ID for the average inputs and extract their values



    inflamacion[cageName] = parseFloat(document.getElementById(`${idPrefix}-Inflamación-promedio`).value) || 0;
    cge[cageName] = parseFloat(document.getElementById(`${idPrefix}-CGE-promedio`).value) || 0;
    degHidropica[cageName] = parseFloat(document.getElementById(`${idPrefix}-Deg. Hidrópica-promedio`).value) || 0;;
    congestion[cageName] = parseFloat(document.getElementById(`${idPrefix}-Congestión-promedio`).value) || 0;
    telangiectasiaTrombosis[cageName] = parseFloat(document.getElementById(`${idPrefix}-Telangiectasia Trombosis-promedio`).value) || 0;
    hemorragia[cageName] = parseFloat(document.getElementById(`${idPrefix}-Hemorragia-promedio`).value) || 0;
    //optionmar[cageName] = parseFloat(document.getElementById(`${idPrefix}-optionmar-promedio`).value) || 0;
    protozoosOrMar[cageName] = parseFloat(document.getElementById(protozoosOrMarId).value) || 0;
    hongosOrOtrosPars[cageName] = parseFloat(document.getElementById(hongosOrOtrosParsId).value) || 0;
    //otrosParasitos[cageName] = parseFloat(document.getElementById(`${idPrefix}-Otros Parasitos-promedio`).value) || 0;
    zooplancton[cageName] = parseFloat(document.getElementById(`${idPrefix}-Zooplancton-promedio`).value) || 0;
    microalgas[cageName] = parseFloat(document.getElementById(`${idPrefix}-Microalgas-promedio`).value) || 0;
    flavoOrTeno[cageName] = parseFloat(document.getElementById(flavoOrTenoId).value) || 0;
    otrasBacterias[cageName] = parseFloat(document.getElementById(`${idPrefix}-Otras Bacterias-promedio`).value) || 0;
  });



  // Assuming 'center-averages-sum' is an input element containing the center average value
  const centerName = document.querySelector('[data-center]').getAttribute('data-center');
  //console.log(centerName);

  // Assuming the center averages are stored with IDs like 'centerName-Hiperplasia lamelar-promedio'
  const categories = ['Inflamación','CGE','Deg. Hidrópica','Congestión','Telangiectasia Trombosis','Hemorragia','optionmar','Otros Parasitos','Zooplancton','Microalgas','Tenocibiboculum','Otras Bacterias'];

  const centerAverages = categories.map(category => {
    //const centerAverageElement = document.getElementById(`${centerName}'-'${category}`);
    const centerAverageElement = document.querySelector(`input[data-center='${centerName}'][class*='${category}']`);
    //console.log("cAveragte",centerAverageElement);
    return centerAverageElement ? parseFloat(centerAverageElement.value) || 0 : 0;
  });
// Now you have the center averages for each category, you can generate the chart
  generateMixedChart2(cageNames, inflamacion, cge, degHidropica, congestion, telangiectasiaTrombosis, hemorragia, protozoosOrMar, hongosOrOtrosPars, zooplancton, microalgas, flavoOrTeno, otrasBacterias, centerAverages, centerName);

}

function generateMixedChart2(cageNames, inflamacion, cge, degHidropica, congestion, telangiectasiaTrombosis, hemorragia, optionmar, otrosParasitos, zooplancton, microalgas, tenocibiboculum, otrasBacterias, centerAverages, centerName) {
  const ctx2 = document.getElementById('myMixedChart2').getContext('2d');

  // Check if the chart instance already exists
  if (window.myMixedChart2 instanceof Chart) {
    window.myMixedChart2.destroy(); // Destroy the existing chart
  }

  // Create datasets for the bars
  const barDatasets = cageNames.map((cageName, index) => ({
    type: 'bar',
    label: cageName,
    data: [
      inflamacion[cageName],
      cge[cageName],
      degHidropica[cageName],
      congestion[cageName],
      telangiectasiaTrombosis[cageName],
      hemorragia[cageName],
      optionmar[cageName],
      otrosParasitos[cageName],
      zooplancton[cageName],
      microalgas[cageName],
      tenocibiboculum[cageName],
      otrasBacterias[cageName]
    ],
    backgroundColor: `rgba(${255 - index * 50}, ${99 + index * 50}, ${132 + index * 50}, 0.2)`,
    borderColor: `rgba(${255 - index * 50}, ${99 + index * 50}, ${132 + index * 50}, 1)`,
    borderWidth: 1
  }));

  // Create a dataset for the line using the center averages for each category
  const lineDataset = {
    type: 'line',
    label: centerName,
    data: centerAverages, // Use the center averages array
    backgroundColor: 'rgba(255, 159, 64, 0.2)',
    borderColor: 'rgba(255, 159, 64, 1)',
    borderWidth: 3,
    fill: false
  };

  // Combine the bar datasets with the line dataset
  const mixedDatasets2 = [...barDatasets, lineDataset];

  // Create a new chart instance
  window.myMixedChart2 = new Chart(ctx2, {
    data: {
      labels: ['Inflamación','CGE','Deg. Hidrópica','Congestión','Telangiectasia Trombosis','Hemorragia','Protozoos','Otros Parasitos','Zooplancton','Microalgas','Tenocibiboculum','Otras Bacterias'],
      datasets: mixedDatasets2
    },
    options: {
      scales: {
        y: {
          beginAtZero: true
        }
      },
      plugins: {
        tooltip: {
          mode: 'index',
          intersect: false
        }
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      }
    }
  });

  createDataTableMixedChart2(cageNames, inflamacion, cge , degHidropica, congestion, telangiectasiaTrombosis, hemorragia, optionmar, otrosParasitos, zooplancton, microalgas, tenocibiboculum, otrasBacterias, centerAverages, centerName);
}

function createDataTableMixedChart2(cageNames, inflamacion, cge, degHidropica, congestion, telangiectasiaTrombosis, hemorragia, optionmar, otrosParasitos, zooplancton, microalgas, tenocibiboculum, otrasBacterias, centerAverages, centerName) {
  const categories = ['Inflamación','CGE','Deg. Hidrópica','Congestión','Telangiectasia Trombosis','Hemorragia','Protozoos','Otros Parasitos','Zooplancton','Microalgas','Tenocibiboculum','Otras Bacterias'];
  let table = '<table border="1">';
  table += '<tr><th>Cage/Center</th>';
  categories.forEach(category => {
    table += `<th>${category}</th>`;
  });
  table += '</tr>';

  // Add rows for each cage
  cageNames.forEach(cageName => {
    table += `<tr><td>${cageName}</td>`;
    table += `<td>${inflamacion[cageName]}</td>`;
    table += `<td>${cge[cageName]}</td>`;
    table += `<td>${degHidropica[cageName]}</td>`;
    table += `<td>${congestion[cageName]}</td>`;
    table += `<td>${telangiectasiaTrombosis[cageName]}</td>`;
    table += `<td>${hemorragia[cageName]}</td>`;
    table += `<td>${optionmar[cageName]}</td>`;
    //console.log(optionmar[cageName]);
    table += `<td>${otrosParasitos[cageName]}</td>`;
    table += `<td>${zooplancton[cageName]}</td>`;
    table += `<td>${microalgas[cageName]}</td>`;
    table += `<td>${tenocibiboculum[cageName]}</td>`;
    table += `<td>${otrasBacterias[cageName]}</td>`;
    table += `</tr>`;
  });

  // Add a row for the center averages
  table += `<tr><td>${centerName}</td>`;
  centerAverages.forEach(average => {
    table += `<td>${average}</td>`;
  });
  table += '</tr>';

  table += '</table>';

  // Append the table to a div or any other container element
  document.getElementById('chartDataTable2').innerHTML = table;
}

//---------------------------BOXPLOT -------------------------------------//

function calculateBoxplotData(identifications) {
  let boxplotData = {
    allScores: [] // Initialize a key to hold all scores across cages
  };

  //console.log("id",identifications)

  // Initialize boxplotData with main cage categories
  identifications.forEach(identification => {
    boxplotData[identification.cage] = [];
  });

  // Select all score input elements
  const scoreInputs = document.querySelectorAll('input[id$="-Score-prom-cage"]'); // Selects inputs where id ends with '-Score-prom-cage'
  //console.log("scoreInputs",scoreInputs)

  // Iterate over each score input to group scores by main cage category
  scoreInputs.forEach(input => {
    const score = parseFloat(input.value);
    if (!isNaN(score)) {
      // Extract the identification ID from the input's ID
      const classParts = input.className.split(' '); // Split by space to get all classes
      //console.log("classParts",classParts)
      const cageClass = classParts.find(cls => cls.includes('score_prom_cage')); // Replace 'cage-identifier' with the actual part of the class that contains the cage identifier
      //console.log("cageClass",cageClass)

      if (cageClass) {
        const cageIdentifierParts = cageClass.split('-'); // Assuming the format is something like 'cage-identifier-123'
        //console.log("cageIdentifierParts",cageIdentifierParts)
        const cageIdentifier = cageIdentifierParts[0]; // Get the last part as the identifier
        //console.log("cageIdentifier",cageIdentifier)

        // Find the corresponding cage name that matches the cage identifier
        const identification = identifications.find(id => id.id.toString() === cageIdentifier);

        if (identification) {
          // Push the score into the array for the main cage category
          boxplotData[identification.cage].push(score);
        }
      }
      // Additionally, push the score into the allScores array
      boxplotData.allScores.push(score)
    }
  });
  // Log the collected data
  //console.log("boxplotData", boxplotData);
  generateBoxplot(boxplotData);
}

function computeBoxplotStats(values) {
  const sortedValues = values.slice().sort((a, b) => a - b);
  const q1 = sortedValues[Math.floor((sortedValues.length / 4))];
  // For median, handle the case of odd and even length arrays
  const median = sortedValues.length % 2 === 0 ?
    (sortedValues[sortedValues.length / 2 - 1] + sortedValues[sortedValues.length / 2]) / 2 :
    sortedValues[Math.floor(sortedValues.length / 2)];
  const q3 = sortedValues[Math.ceil((sortedValues.length * (3 / 4))) - 1];
  const iqr = q3 - q1;
  const min = q1 - 1.5 * iqr;
  const max = q3 + 1.5 * iqr;

  return { min, q1, median, q3, max };
}

function generateBoxplotDataForChart(boxplotData) {
  // Assuming boxplotData is structured with keys as labels and values as arrays of scores
  const datasets = [{
    label: 'Boxplot Data',
    data: Object.values(boxplotData), // Directly use the arrays of scores
    backgroundColor: 'rgba(0, 123, 255, 0.5)',
    borderColor: 'rgba(0, 123, 255, 1)',
  }];

  return {
    labels: Object.keys(boxplotData), // Use the category names as labels
    datasets: datasets
  };
}

function generateBoxplot(rawBoxplotData) {
  const ctx = document.getElementById('myBoxChart').getContext('2d');
  const dataForChart = generateBoxplotDataForChart(rawBoxplotData);

  // Destroy the existing chart instance if it exists
  if (myBoxChartInstance) {
    myBoxChartInstance.destroy();
  }

  // Create a new chart instance
  myBoxChartInstance = new Chart(ctx, {
    type: 'boxplot',
    data: dataForChart,
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Score'
          }
        }
      }
    },
  });
}


//----------------------------------------------------------------//
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

$("#report_edit").on("submit", async function (event) {
  event.preventDefault();

  // Perform verification checks
  if (checkimagesfile() && checkForm()) {

    var id = window.location.pathname.split("/")[2];
    const dataForm = new FormData(this);

    // Right before the AJAX request in your submit event handler
    const tableHTML1 = document.getElementById('chartDataTable').innerHTML;
    const tableHTML2 = document.getElementById('chartDataTable2').innerHTML;

    // Append the table HTML to the FormData object
    dataForm.append('tableHTML1', tableHTML1);
    dataForm.append('tableHTML2', tableHTML2);

    // Get all canvas elements
    const charts = ['myChart', 'myMixedChart', 'myMixedChart2', 'myBoxChart'];


    // Loop through each chart, convert to image, and append to FormData
    for (const chartId of charts) {
      const canvas = document.getElementById(chartId);
      if (canvas) {
        const canvasImage = canvas.toDataURL('image/png');
        const blob = await (await fetch(canvasImage)).blob();
        dataForm.append(chartId, blob, chartId + ".png");
      }
    }

    //dataForm.append("graphImage", blob, "graph.png");

    dataForm.delete("methodology"); // Adjust according to your needs


    try {
      // Assuming you want to generate and download the PDF directly
      const response = await $.ajax({
        url: Urls.download_consolidados_SG(id), // Make sure this points to the PDF generation endpoint
        method: "POST",
        processData: false,
        contentType: false,
        data: dataForm,
        xhrFields: {
          responseType: 'blob' // Expect a blob response to handle the PDF download
        },
        success: function(data) {
          // Create a URL for the blob
          const url = window.URL.createObjectURL(new Blob([data], {type: 'application/pdf'}));
          // Open the PDF in a new tab
          window.open(url, '_blank');
        },
        error: function(xhr, status, error) {
          console.error("Error generating PDF:", error);
          toastr.warning("Error occurred. Please try again.");
        }
      });
    } catch (error) {
      console.error("Error in AJAX request:", error);
      toastr.warning("Error occurred. Please try again.");
    }
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
