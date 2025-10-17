const API_URL = "http://localhost:5187/api/Oportunidades";

let chart;

document.addEventListener("DOMContentLoaded", function () {
  cargarDatos();

  document.getElementById("btnFiltrar").addEventListener("click", () => {
    cargarDatos();
  });

  document.getElementById("btnExportar").addEventListener("click", () => {
    exportarExcel();
  });
});

async function cargarDatos() {
  const fechaInicio = document.getElementById("fechaInicio").value;
  const fechaFin = document.getElementById("fechaFin").value;

  let url = "http://localhost:5187/api/Oportunidades?estado=Cerrada";
  if (fechaInicio) url += `&fechaInicio=${fechaInicio}`;
  if (fechaFin) url += `&fechaFin=${fechaFin}`;

  try {
    const res = await fetch(url);
    const oportunidades = await res.json();

    // Agrupa por mes y suma montos
    const agrupado = {};
    oportunidades.forEach(o => {
      const fecha = new Date(o.fechaCierre);
      const monto = Number(o.ValorEstimado ?? o.valorEstimado ?? 0);
      const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      agrupado[key] = (agrupado[key] || 0) + monto;
    });

    const etiquetas = Object.keys(agrupado).sort();
    const valores = etiquetas.map(e => agrupado[e]);

    renderizarGrafico(etiquetas, valores);
  } catch (error) {
    console.error("Error al cargar datos:", error);
  }
}

function renderizarGrafico(labels, data) {
  const ctx = document.getElementById('graficoVentas').getContext('2d');

  if (chart) {
    chart.destroy();
  }

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Ventas Cerradas',
        data: data,
        borderColor: '#007bff',
        backgroundColor: 'rgba(0, 123, 255, 0.1)',
        tension: 0.3,
        fill: true
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true },
        tooltip: { enabled: true }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return 'Q' + value.toLocaleString();
            }
          }
        }
      }
    }
  });
}

// Exportar a Excel
async function exportarExcel() {
  const fechaInicio = document.getElementById("fechaInicio").value;
  const fechaFin = document.getElementById("fechaFin").value;

  let url = "http://localhost:5187/api/Analytics/ExportarExcel?estado=Cerrada";
  if (fechaInicio) url += `&fechaInicio=${fechaInicio}`;
  if (fechaFin) url += `&fechaFin=${fechaFin}`;

  window.open(url, "_blank");
}