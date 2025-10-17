using Microsoft.AspNetCore.Mvc;
using CRMVentasAPI.Data;
using CRMVentasAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace CRMVentasAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class OportunidadesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public OportunidadesController(AppDbContext context)
        {
            _context = context;
        }

        [HttpPost]
        public async Task<ActionResult<Oportunidad>> Crear(Oportunidad oportunidad)
        {
            _context.Oportunidades.Add(oportunidad);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetPorId), new { id = oportunidad.Id }, oportunidad);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Oportunidad>> GetPorId(int id)
        {
            var oportunidad = await _context.Oportunidades
                .Include(o => o.Cliente)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (oportunidad == null)
                return NotFound();

            return oportunidad;
        }

        [HttpGet("todas")]
        public async Task<ActionResult<IEnumerable<Oportunidad>>> GetTodas()
        {
            return await _context.Oportunidades.Include(o => o.Cliente).ToListAsync();
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Oportunidad>>> GetAll(
            [FromQuery] string estado = null,
            [FromQuery] DateTime? fechaInicio = null,
            [FromQuery] DateTime? fechaFin = null)
        {
            var query = _context.Oportunidades.AsQueryable();

            if (!string.IsNullOrEmpty(estado))
                query = query.Where(o => o.Estado == estado);

            if (fechaInicio.HasValue)
                query = query.Where(o => o.FechaCierre >= fechaInicio.Value);

            if (fechaFin.HasValue)
                query = query.Where(o => o.FechaCierre <= fechaFin.Value);

            return await query.Include(o => o.Cliente).ToListAsync();
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Actualizar(int id, [FromBody] Oportunidad oportunidad)
        {
            if (id != oportunidad.Id)
                return BadRequest();

            _context.Entry(oportunidad).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
