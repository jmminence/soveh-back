// Agregar names a los inpur y select del formulario
document.getElementById("dataForm").addEventListener("submit", function (e) {
    e.preventDefault();
    console.log(e)
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
  myFormData.forEach(function (value, key) {
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
function load(sampleexamresults) {
  sampleexamresults.forEach(function (sampleexamresult) {
    console.log(sampleexamresult.sample_id)
    console.log(sampleexamresult.result)
    var input = document.getElementById(`${sampleexamresult.sample_id}-${sampleexamresult.result}`);
    input.value = sampleexamresult.value; //ej.
    console.log(input)
  });
}