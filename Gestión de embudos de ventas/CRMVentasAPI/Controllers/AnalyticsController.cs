// CRMVentasAPI/Controllers/AnalyticsController.cs
using Microsoft.AspNetCore.Mvc;
using CRMVentasAPI.Data;
using Microsoft.EntityFrameworkCore;
using System.Text;
using ClosedXML.Excel;

namespace CRMVentasAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AnalyticsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AnalyticsController(AppDbContext context)
        {
            _context = context;
        }

        // Conversión entre etapas (simplificada sin historial)
        private double CalcularTasaConversion(int totalEtapaAnterior, int totalEtapaActual)
        {
            if (totalEtapaAnterior == 0) return 0;
            return ((double)totalEtapaActual / totalEtapaAnterior) * 100;
        }

        // Filtros + resumen embudo
        [HttpGet("embudo/resumen")]
        public async Task<IActionResult> ObtenerResumen([FromQuery] string vendedor = null, [FromQuery] DateTime? desde = null, [FromQuery] DateTime? hasta = null)
        {

            var query = _context.Oportunidades.AsQueryable();

            if (!string.IsNullOrEmpty(vendedor))
                query = query.Where(o => o.Vendedor == vendedor);

            if (desde.HasValue)
                query = query.Where(o => o.FechaCreacion >= desde);

            if (hasta.HasValue)
                query = query.Where(o => o.FechaCreacion <= hasta);

            var oportunidades = await query.ToListAsync();

            var etapasOrdenadas = oportunidades.Select(o => o.Etapa).Distinct().OrderBy(e => e).ToList();

            var resumen = etapasOrdenadas.Select(etapa =>
            {
                var etapaOportunidades = oportunidades.Where(o => o.Etapa == etapa).ToList();
                var total = etapaOportunidades.Count;
                var anteriorIndex = etapasOrdenadas.IndexOf(etapa) - 1;
                var anteriorEtapa = anteriorIndex >= 0 ? etapasOrdenadas[anteriorIndex] : null;
                var totalAnterior = anteriorEtapa != null ? oportunidades.Count(o => o.Etapa == anteriorEtapa) : total;

                return new
                {
                    Etapa = etapa,
                    Cantidad = total,
                    ValorTotal = etapaOportunidades.Sum(o => o.ValorEstimado),
                    TiempoPromedio = etapaOportunidades.Average(o => (DateTime.Now - o.FechaCierreProbable).TotalDays),
                    TasaGanada = (double)etapaOportunidades.Count(o => o.Estado == "Cerrada-Ganada") / total * 100,
                    TasaPerdida = (double)etapaOportunidades.Count(o => o.Estado == "Cerrada-Perdida") / total * 100,
                    CuelloBotella = etapaOportunidades.Average(o => (DateTime.Now - o.FechaCierreProbable).TotalDays) > 10,
                    TasaConversion = CalcularTasaConversion(totalAnterior, total)
                };
            });

            var valorPrevisto = oportunidades.Where(o => o.Estado == "Abierta").Sum(o => o.ValorEstimado);

            return Ok(new
            {
                ResumenPorEtapa = resumen,
                ValorAcumuladoPrevisto = valorPrevisto
            });
        }

        // Comparativas históricas por mes
        [HttpGet("embudo/comparativo")]
        public async Task<IActionResult> ComparativoMensual()
        {
            var oportunidades = await _context.Oportunidades.ToListAsync();

            var comparativo = oportunidades
                .GroupBy(o => new { o.FechaCreacion.Year, o.FechaCreacion.Month })
                .OrderBy(g => g.Key.Year).ThenBy(g => g.Key.Month)
                .Select(g => new
                {
                    Mes = $"{g.Key.Month}/{g.Key.Year}",
                    TotalOportunidades = g.Count(),
                    ValorTotal = g.Sum(o => o.ValorEstimado)
                });

            return Ok(comparativo);
        }

        // Exportación JSON para dashboards
        [HttpGet("embudo/export/json")]
        public async Task<IActionResult> ExportToJson()
        {
            var oportunidades = await _context.Oportunidades.ToListAsync();

            var datos = oportunidades
                .GroupBy(o => o.Etapa)
                .Select(g => new
                {
                    Etapa = g.Key,
                    Cantidad = g.Count(),
                    ValorTotal = g.Sum(o => o.ValorEstimado)
                });

            return Ok(datos);
        }

        [HttpGet("ExportarExcel")]
        public async Task<IActionResult> ExportarExcel([FromQuery] string estado, [FromQuery] DateTime? fechaInicio, [FromQuery] DateTime? fechaFin)
        {
            var query = _context.Oportunidades.AsQueryable();

            if (!string.IsNullOrEmpty(estado))
                query = query.Where(o => o.Estado == estado);

            if (fechaInicio.HasValue)
                query = query.Where(o => o.FechaCierre >= fechaInicio.Value);

            if (fechaFin.HasValue)
                query = query.Where(o => o.FechaCierre <= fechaFin.Value);

            var oportunidades = await query.ToListAsync();

            using var workbook = new XLWorkbook();
            var worksheet = workbook.Worksheets.Add("Oportunidades");

            // Encabezados
            worksheet.Cell(1, 1).Value = "ID";
            worksheet.Cell(1, 2).Value = "Titulo";
            worksheet.Cell(1, 3).Value = "Estado";
            worksheet.Cell(1, 4).Value = "ValorEstimado";
            worksheet.Cell(1, 5).Value = "FechaCierre";
            worksheet.Cell(1, 6).Value = "Vendedor";

            // Datos
            for (int i = 0; i < oportunidades.Count; i++)
            {
                var o = oportunidades[i];
                worksheet.Cell(i + 2, 1).Value = o.Id;
                worksheet.Cell(i + 2, 2).Value = o.Titulo ?? "";
                worksheet.Cell(i + 2, 3).Value = o.Estado ?? "";
                worksheet.Cell(i + 2, 4).Value = o.ValorEstimado;
                worksheet.Cell(i + 2, 5).Value = o.FechaCierre?.ToString("yyyy-MM-dd") ?? "";
                worksheet.Cell(i + 2, 6).Value = o.Vendedor ?? "";
            }

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            stream.Seek(0, SeekOrigin.Begin);

            return File(stream.ToArray(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "prevision_ventas.xlsx");
        }
    }
}


