let oportunidad = [];
let draggedCard = null;
let modalStage = 'nuevo';
let editingoportunidad = null;

document.addEventListener('DOMContentLoaded', function() {
    initializeDragAndDrop();
    initializeModalEvents();
    cargaroportunidad();

    // Configurar fecha de cierre por defecto (7 días desde hoy)
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    document.getElementById('closeDateInput').valueAsDate = nextWeek;

    document.getElementById('companySelect').addEventListener('change', function() {
        const customCompanyGroup = document.getElementById('customCompanyGroup');
        if (this.value === 'other') {
            customCompanyGroup.style.display = 'block';
            document.getElementById('customCompanyInput').required = true;
        } else {
            customCompanyGroup.style.display = 'none';
            document.getElementById('customCompanyInput').required = false;
        }
    });
});

async function cargaroportunidad() {
    try {
        const response = await fetch('http://localhost:5187/api/Oportunidades'); // Ajusta el puerto si es necesario
        oportunidad = await response.json();
        renderoportunidad();
    } catch (error) {
        showNotification('Error al cargar oportunidades');
    }
}

function renderoportunidad() {
    document.querySelectorAll('.cards-container').forEach(c => c.innerHTML = '');

    oportunidad.forEach(p => {
        const card = document.createElement('div');
        card.className = 'opportunity-card';
        card.draggable = true;
        card.dataset.id = p.id;
        card.dataset.stage = p.estado ? p.estado.toLowerCase() : 'nuevo';
        card.dataset.titulo = p.titulo || '';
        card.dataset.valorestimado = p.valorEstimado || 0;
        card.dataset.fechacierre = p.fechaCierre || '';
        card.dataset.vendedor = p.vendedor || '';
        card.dataset.estado = p.estado || '';
        card.dataset.clienteid = p.clienteId || '';

        card.innerHTML = `
            <div class="card-header">
                <div class="card-title">${p.titulo || ''}</div>
                <div class="card-actions">
                    <button class="card-action-btn edit" onclick="editCard(this)">🖊️</button>
                </div>
            </div>
            <div class="card-amount">Q${p.valorEstimado?.toLocaleString('es-ES') || 0}</div>
            <div class="card-client">Vendedor: ${p.vendedor || ''}</div>
            <div class="card-date" style="font-size: 12px; color: #6c757d; margin-top: 4px;">📅 ${formatDate(p.fechaCierre)}</div>
            <div class="card-state">Estado: ${p.estado || ''}</div>
        `;

        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);

        const columna = document.querySelector(`.kanban-column[data-stage="${card.dataset.stage}"] .cards-container`);
        if (columna) columna.appendChild(card);
    });

    updateColumnTotals();
}

function editCard(button) {
    const card = button.closest('.opportunity-card');
    openModal('editar', card);
}

function openModal(stage = 'editar', card = null) {
    modalStage = stage;
    editingoportunidad = null;

    const modal = document.getElementById('opportunityModal');
    const stageTag = document.getElementById('modalStageTag');
    const modalTitle = document.getElementById('modalTitle');
    const saveButton = document.getElementById('saveButton');
    const deleteButton = document.getElementById('deleteButton');

    if (stage === 'editar' && card) {
        // Busca el objeto de oportunidad por id
        const registro = oportunidad.find(p => p.id == card.dataset.id);
        editingoportunidad = registro; // <-- Aquí el objeto, no el elemento
        saveButton.textContent = 'Guardar';
        deleteButton.style.display = 'inline-block';
        loadCardDataToForm(card);
    } else {
        modalTitle.textContent = 'Nueva oportunidad';
        saveButton.textContent = 'Agregar';
        deleteButton.style.display = 'none';
        clearForm();
    }

    stageTag.textContent = stage.charAt(0).toUpperCase() + stage.slice(1);

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    document.getElementById('opportunityNameInput').focus();
}

function closeModal() {
    const modal = document.getElementById('opportunityModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
    editingoportunidad = null;
}

function clearForm() {
    document.getElementById('opportunityForm').reset();
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    document.getElementById('closeDateInput').valueAsDate = nextWeek;
    document.getElementById('customCompanyGroup').style.display = 'none';
}

function loadCardDataToForm(card) {
    const registro = oportunidad.find(p => p.id == card.dataset.id);
    if (!registro) return;

    document.getElementById('titulo').value = registro.titulo || '';
    document.getElementById('estado').value = registro.estado || '';
    document.getElementById('valorEstimado').value = registro.valorEstimado || 0;
    document.getElementById('fechaCierre').value = registro.fechaCierre ? registro.fechaCierre.split('T')[0] : '';
    document.getElementById('vendedor').value = registro.vendedor || '';
    document.getElementById('nombre').value = registro.nombre || '';
    if (document.getElementById('clienteId')) {
        document.getElementById('clienteId').value = registro.clienteId || '';
    }

    if (card.dataset.company) {
        const isCustomCompany = !['Hardware Express', 'Junicon', 'MC donalds', 'ABC Electronics'].includes(card.dataset.company);
        if (isCustomCompany) {
            document.getElementById('companySelect').value = 'other';
            document.getElementById('customCompanyInput').value = card.dataset.company;
            document.getElementById('customCompanyGroup').style.display = 'block';
        } else {
            document.getElementById('companySelect').value = card.dataset.company;
        }
    }
}

async function saveOpportunity() {
    const id = editingoportunidad ? editingoportunidad.id : null;
    const oportunidadActualizada = {
        id,
        titulo: document.getElementById('titulo').value,
        estado: document.getElementById('estado').value,
        valorEstimado: parseFloat(document.getElementById('valorEstimado').value),
        fechaCierre: document.getElementById('fechaCierre').value,
        vendedor: document.getElementById('vendedor').value,
        nombre: document.getElementById('nombre').value
    };

    try {
        let url = 'http://localhost:5187/api/Oportunidades';
        let method = 'POST';
        if (id) {
            url += `/${id}`;
            method = 'PUT';
        }
        await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(oportunidadActualizada)
        });
        closeModal();
        cargaroportunidad();
    } catch (error) {
        alert('Error al guardar la oportunidad');
    }
}

async function deleteOpportunity() {
    if (editingoportunidad && confirm('¿Estás seguro de que deseas eliminar esta oportunidad?')) {
        try {
            await fetch(`http://localhost:5000/api/oportunidad/${editingoportunidad.dataset.id}`, {
                method: 'DELETE'
            });
            closeModal();
            cargaroportunidad();
            showNotification('oportunidad eliminada');
        } catch (error) {
            showNotification('Error al eliminar oportunidad');
        }
    }
}

function formatDate(dateString) {
    if (!dateString) return '';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('es-ES', options);
}

function formatCurrency(amount) {
    if (!amount) return '0 Q';
    if (amount >= 1000000) {
        return (amount / 1000000).toFixed(0) + 'M Q';
    } else if (amount >= 1000) {
        return (amount / 1000).toFixed(0) + 'k Q';
    }
    return amount.toLocaleString('es-ES') + ' Q';
}

function initializeDragAndDrop() {
    const columns = document.querySelectorAll('.cards-container');
    columns.forEach(column => {
        column.addEventListener('dragover', handleDragOver);
        column.addEventListener('drop', handleDrop);
        column.addEventListener('dragenter', handleDragEnter);
        column.addEventListener('dragleave', handleDragLeave);
    });
}

function handleDragStart(e) {
    draggedCard = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.outerHTML);
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    draggedCard = null;
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
    e.preventDefault();
    this.classList.add('drag-over');
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

async function handleDrop(e) {
    e.preventDefault();
    this.classList.remove('drag-over');
    if (draggedCard) {
        const targetStage = this.closest('.kanban-column').dataset.stage;
        const oportunidadId = draggedCard.dataset.id;
        try {
            await fetch(`http://localhost:5187/api/Oportunidades/${oportunidadId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...oportunidad.find(p => p.id == oportunidadId), estado: targetStage })
            });
            cargaroportunidad();
            showNotification(`Oportunidad movida a ${targetStage}`);
        } catch (error) {
            showNotification('Error al mover oportunidad');
        }
    }
}

function updateColumnTotals() {
    const columns = document.querySelectorAll('.kanban-column');
    columns.forEach(column => {
        const stage = column.dataset.stage;
        const opportunitiesInStage = oportunidad.filter(p => (p.estado || '').toLowerCase() === stage);
        let total = 0;
        opportunitiesInStage.forEach(p => {
            total += p.monto || 0;
        });
        const totalElement = column.querySelector('.column-total');
        if (totalElement) {
            totalElement.textContent = total > 0 ? formatCurrency(total) : '0 Q';
        }
    });
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #20c997;
        color: white;
        padding: 12px 24px;
        border-radius: 6px;
        font-weight: 500;
        z-index: 9999;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

function initializeModalEvents() {
    const formFields = document.querySelectorAll('.form-field');
    formFields.forEach(field => {
        const input = field.querySelector('.form-input, .form-select, textarea');
        if (input) {
            input.addEventListener('focus', () => field.classList.add('focused'));
            input.addEventListener('blur', () => field.classList.remove('focused'));
        }
    });
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);