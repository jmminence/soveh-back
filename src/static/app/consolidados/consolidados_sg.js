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

function generateChartProms(data, labels) {
  console.log('Data:', data); // This will show you what 'data' actually is
  console.log('Data type:', typeof data); // This will show you the type of 'data'

  const ctx = document.getElementById('myChart').getContext('2d');

  // Define your threshold values
  const threshold1 = 4; // Example threshold
  const threshold2 = 7; // Example threshold
  const threshold3 = 10; // Example threshold


  // Convert 'data' to an array if it's not already
  if (!Array.isArray(data)) {
    data = Object.values(data);
  }

  // Chart options
  const chartOptions = {

    plugins: {
      legend: {
        display: true,
        labels: {
          color: 'rgb(5, 99, 32)'
        }
      },
      tooltip: {
        enabled: true
      },
      datalabels: {
        color: '#000000',
        anchor: 'end',
        align: 'top',
        formatter: (value, context) => {
          return value.toLocaleString(); // or return value.toFixed(2) for decimal values
        }
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
          },
          text5: {
            type: 'label',
            xValue: 'TK 3', // Adjust this based on your x-axis scale
            yValue: threshold1, // Position it between threshold2 and threshold3
            content: data[0]+'actualizar segun its', // The text you want to display
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
          // Add more text annotations as needed
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

  // If the chart instance already exists, update its data and labels
  if (window.myChart instanceof Chart) {
      window.myChart.data.labels = labels;
      window.myChart.data.datasets[0].data = data;
      window.myChart.update();
  } else {
      // If the chart does not exist, create a new instance
      window.myChart = new Chart(ctx, {
          type: 'bar',
          data: {
              labels: labels,
              datasets: [{
                  label: 'Score Promedio de Salud Branquial (0-24)',
                  data: data,
                  backgroundColor:'rgba(1, 99, 132)',
                  borderColor: 'rgba(2, 9, 1)',
                  borderWidth: 1
              }]
          },
          options: chartOptions
      });
  }
}

function generateChartPromsBoxed(data, labels) {
  // Ensure the Chart.js and the boxplot plugin are correctly imported
  // For ES modules, you would typically import these at the top of your file:
  // import Chart from 'chart.js/auto';
  // import 'chartjs-chart-box-and-violin-plot';

  const ctx = document.getElementById('myBoxChart').getContext('2d');

  // Assuming 'data' is correctly formatted for the boxplot chart
  // The data format for a boxplot typically includes min, q1, median, q3, max, and outliers for each dataset

  // Chart options
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: true
      },
      tooltip: {
        enabled: true
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  // Check if the chart instance already exists
  if (window.myBoxChart instanceof Chart) {
    window.myBoxChart.data.labels = labels;
    window.myBoxChart.data.datasets[0].data = data;
    window.myBoxChart.update();
  } else {
    // Create a new boxplot chart instance
    window.myBoxChart = new Chart(ctx, {
      type: 'boxplot', // Specify the chart type as 'boxplot'
      data: {
        labels: labels,
        datasets: [{
          label: 'Score Promedio de Salud Branquial (0-24)',
          backgroundColor: 'rgba(1, 99, 132, 0.5)',
          borderColor: 'rgba(2, 9, 1, 1)',
          borderWidth: 1,
          outlierColor: '#999999',
          padding: 10,
          itemRadius: 0,
          data: data // The structured data for the boxplot
        }]
      },
      options: chartOptions
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

  // Update the DOM for each category's score_row with the sum
  Object.keys(categorySums).forEach(categoryId => {
    //(categorySums)
    const sum = categorySums[categoryId];
    const scoreRow = document.getElementsByClassName(`${categoryId}-score_prom`)[0];
    //console.log(`Updating scoreRow for categoryId: ${categoryId}, sum: ${sum}`);

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
  console.log("valuesBySampleId", valuesBySampleId);
  prepareBoxplotData(valuesBySampleId);

  // Update the UI based on sumBySampleId for other results
  Object.keys(sumBySampleId).forEach(sample_id => {
      const inputElement = document.getElementById(`${sample_id}-Score-prom-cage`);
      if (inputElement) {
          inputElement.value = sumBySampleId[sample_id];
          console.log(`Updated UI for ${sample_id}: ${sumBySampleId[sample_id]}`);
      } else {
          console.log(`Could not find input element for ${sample_id}-Score-prom-cage`);
      }
  });

  const cageNames = Array.from(document.querySelectorAll('th[data-cage-name]')).map(element => element.getAttribute('data-cage-name'));

  console.log("cageNames", cageNames,"sumbySampleId", sumBySampleId);

  console.log("Finished promedio_cages function");
  generateChartProms(sumBySampleId, cageNames);
}

function prepareBoxplotData(valuesByCategory) {
  const boxplotData = Object.keys(valuesByCategory).map(category => {
    const values = valuesByCategory[category].sort((a, b) => a - b);
    const min = values[0];
    const max = values[values.length - 1];
    const median = calculateMedian(values);
    const q1 = calculateQuartile(values, 0.25);
    const q3 = calculateQuartile(values, 0.75);
    const outliers = calculateOutliers(values); // Implement based on your criteria

    return {
      category,
      min,
      q1,
      median,
      q3,
      max,
      outliers
    };
  });


  return generateChartPromsBoxed(boxplotData);
}

// Example helper function to calculate the median
function calculateMedian(values) {
  const half = Math.floor(values.length / 2);
  if (values.length % 2) return values[half];
  return (values[half - 1] + values[half]) / 2.0;
}

function calculateQuartile(values, q) {
  const pos = (values.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;

  if (values[base + 1] !== undefined) {
    return values[base] + rest * (values[base + 1] - values[base]);
  } else {
    return values[base];
  }
}

function calculateOutliers(values) {
  const q1 = calculateQuartile(values, 0.25);
  const q3 = calculateQuartile(values, 0.75);
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  return values.filter(value => value < lowerBound || value > upperBound);
}