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
