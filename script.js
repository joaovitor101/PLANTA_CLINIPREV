let state = {
    currentFloor: 1,
    areas: { 1: [], 2: [] },
    plantImages: { 1: null, 2: null },
    currentAreaId: null,
    isDrawing: false,
    drawingStart: null,
    tempAreaCoords: null,
    currentEquipmentType: null,
    editingEquipmentId: null,
    draggingIcon: null
};

// Endpoint da API: detecta se está no Vercel ou local
const isVercel = window.location.hostname.includes('vercel.app') || window.location.hostname.includes('vercel.com');
const API_BASE = isVercel ? '/api' : '';
const API_URL = window.location.origin + API_BASE;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('file-input').addEventListener('change', handleFileUpload);
    document.getElementById('floor-select').addEventListener('change', handleFloorChange);
    document.getElementById('add-area-btn').addEventListener('click', openAreaModal);
    document.getElementById('upload-btn').addEventListener('click', () => document.getElementById('file-input').click());
    document.getElementById('reset-btn').addEventListener('click', resetPlant);
    document.getElementById('close-sidebar').addEventListener('click', closeSidebar);
    document.getElementById('export-btn').addEventListener('click', exportData);
    document.getElementById('import-btn').addEventListener('click', () => document.getElementById('import-file-input').click());
    
    const uploadBox = document.querySelector('.upload-box');
    uploadBox.addEventListener('dragover', (e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--primary-color)'; });
    uploadBox.addEventListener('drop', handleDrop);
    uploadBox.addEventListener('dragleave', (e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; });
    
    // Fechar modais ao clicar fora
    document.getElementById('equipment-view-modal').addEventListener('click', (e) => {
        if (e.target.id === 'equipment-view-modal') closeEquipmentViewModal();
    });
    
    // Sistema global de drag and drop para ícones
    let globalDragState = { isDragging: false, iconGroup: null, dragStart: { x: 0, y: 0 }, iconPos: { x: 0, y: 0 }, area: null, equipment: null, iconSize: 50 };
    
    // Sistema global de redimensionamento de áreas
    let resizeState = { isResizing: false, handle: null, area: null, startCoords: null, startMouse: null };
    
    document.addEventListener('mousemove', (e) => {
        // Redimensionamento de área
        if (resizeState.isResizing && resizeState.area && resizeState.handle) {
            const overlay = document.getElementById('areas-overlay');
            if (!overlay) return;
            
            const svgPoint = overlay.createSVGPoint();
            svgPoint.x = e.clientX;
            svgPoint.y = e.clientY;
            const ctm = overlay.getScreenCTM();
            if (ctm) {
                const svgCoords = svgPoint.matrixTransform(ctm.inverse());
                const handleType = resizeState.handle.getAttribute('data-handle-type');
                const area = resizeState.area;
                const startCoords = resizeState.startCoords;
                const startMouse = resizeState.startMouse;
                
                let newX = startCoords.x;
                let newY = startCoords.y;
                let newWidth = startCoords.width;
                let newHeight = startCoords.height;
                
                const minSize = 50; // Tamanho mínimo da área
                
                switch(handleType) {
                    case 'nw': // Canto superior esquerdo
                        newWidth = startCoords.width + (startMouse.x - svgCoords.x);
                        newHeight = startCoords.height + (startMouse.y - svgCoords.y);
                        newX = svgCoords.x;
                        newY = svgCoords.y;
                        if (newWidth < minSize) { newX = startCoords.x + startCoords.width - minSize; newWidth = minSize; }
                        if (newHeight < minSize) { newY = startCoords.y + startCoords.height - minSize; newHeight = minSize; }
                        break;
                    case 'ne': // Canto superior direito
                        newWidth = startCoords.width + (svgCoords.x - startMouse.x);
                        newHeight = startCoords.height + (startMouse.y - svgCoords.y);
                        newY = svgCoords.y;
                        if (newWidth < minSize) newWidth = minSize;
                        if (newHeight < minSize) { newY = startCoords.y + startCoords.height - minSize; newHeight = minSize; }
                        break;
                    case 'sw': // Canto inferior esquerdo
                        newWidth = startCoords.width + (startMouse.x - svgCoords.x);
                        newHeight = startCoords.height + (svgCoords.y - startMouse.y);
                        newX = svgCoords.x;
                        if (newWidth < minSize) { newX = startCoords.x + startCoords.width - minSize; newWidth = minSize; }
                        if (newHeight < minSize) newHeight = minSize;
                        break;
                    case 'se': // Canto inferior direito
                        newWidth = startCoords.width + (svgCoords.x - startMouse.x);
                        newHeight = startCoords.height + (svgCoords.y - startMouse.y);
                        if (newWidth < minSize) newWidth = minSize;
                        if (newHeight < minSize) newHeight = minSize;
                        break;
                    case 'n': // Borda superior
                        newHeight = startCoords.height + (startMouse.y - svgCoords.y);
                        newY = svgCoords.y;
                        if (newHeight < minSize) { newY = startCoords.y + startCoords.height - minSize; newHeight = minSize; }
                        break;
                    case 's': // Borda inferior
                        newHeight = startCoords.height + (svgCoords.y - startMouse.y);
                        if (newHeight < minSize) newHeight = minSize;
                        break;
                    case 'w': // Borda esquerda
                        newWidth = startCoords.width + (startMouse.x - svgCoords.x);
                        newX = svgCoords.x;
                        if (newWidth < minSize) { newX = startCoords.x + startCoords.width - minSize; newWidth = minSize; }
                        break;
                    case 'e': // Borda direita
                        newWidth = startCoords.width + (svgCoords.x - startMouse.x);
                        if (newWidth < minSize) newWidth = minSize;
                        break;
                }
                
                // Atualizar coordenadas da área
                area.coords.x = newX;
                area.coords.y = newY;
                area.coords.width = newWidth;
                area.coords.height = newHeight;
                
                // Atualizar visualização
                updateAreasOverlay();
            }
        }
        // Drag and drop de ícones
        else if (globalDragState.isDragging && globalDragState.iconGroup && globalDragState.iconGroup.parentNode) {
            const overlay = document.getElementById('areas-overlay');
            if (!overlay) return;
            
            const svgPoint = overlay.createSVGPoint();
            svgPoint.x = e.clientX;
            svgPoint.y = e.clientY;
            const ctm = overlay.getScreenCTM();
            if (ctm) {
                const svgCoords = svgPoint.matrixTransform(ctm.inverse());
                let newX = svgCoords.x - globalDragState.dragStart.x;
                let newY = svgCoords.y - globalDragState.dragStart.y;
                
                // Limitar dentro da área
                const area = globalDragState.area;
                const iconSize = globalDragState.iconSize;
                const iconHeight = globalDragState.equipment.type === 'notebook' ? iconSize * 0.7 : iconSize * 0.8;
                newX = Math.max(area.coords.x, Math.min(newX, area.coords.x + area.coords.width - iconSize));
                newY = Math.max(area.coords.y, Math.min(newY, area.coords.y + area.coords.height - iconHeight));
                
                globalDragState.iconPos = { x: newX, y: newY };
                globalDragState.iconGroup.setAttribute('transform', `translate(${newX}, ${newY})`);
            }
        }
    });
    
    document.addEventListener('mouseup', () => {
        if (resizeState.isResizing) {
            resizeState.isResizing = false;
            if (resizeState.area) {
                saveToStorage();
            }
            resizeState.handle = null;
            resizeState.area = null;
            resizeState.startCoords = null;
            resizeState.startMouse = null;
        }
        if (globalDragState.isDragging) {
            globalDragState.isDragging = false;
            // Salvar posição
            if (globalDragState.equipment) {
                globalDragState.equipment.iconX = globalDragState.iconPos.x;
                globalDragState.equipment.iconY = globalDragState.iconPos.y;
                saveToStorage();
            }
            globalDragState.iconGroup = null;
            globalDragState.equipment = null;
            globalDragState.area = null;
        }
    });
    
    window.globalDragState = globalDragState;
    window.resizeState = resizeState;
    
    // Verificar se a API está disponível
    checkApiConnection();
    
    loadFromStorage();
});

// Verificar conexão com a API
async function checkApiConnection() {
    try {
        const response = await fetch(`${API_URL}/data`);
        if (response.ok) {
            console.log('✅ API conectada - dados serão salvos automaticamente');
        } else {
            console.warn('⚠️ API retornou erro - usando apenas localStorage');
        }
    } catch (err) {
        console.warn('⚠️ API não disponível - usando apenas localStorage. Certifique-se de que o servidor está rodando (node server.js)');
    }
}

// Exportar/Importar dados
function exportData() {
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'planta-clinica-dados.json';
    a.click();
    URL.revokeObjectURL(url);
}

document.addEventListener('DOMContentLoaded', () => {
    let importInput = document.getElementById('import-file-input');
    if (!importInput) {
        importInput = document.createElement('input');
        importInput.type = 'file';
        importInput.accept = 'application/json';
        importInput.id = 'import-file-input';
        importInput.style.display = 'none';
        document.body.appendChild(importInput);
    }
    importInput.addEventListener('change', importData);
});

function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
        try {
            const imported = JSON.parse(evt.target.result);
            if (!imported || !imported.areas || !imported.plantImages) {
                alert('Arquivo inválido.');
                return;
            }
            state = {
                currentFloor: imported.currentFloor || 1,
                areas: imported.areas || { 1: [], 2: [] },
                plantImages: imported.plantImages || { 1: null, 2: null },
                currentAreaId: null,
                isDrawing: false,
                drawingStart: null,
                tempAreaCoords: null,
                currentEquipmentType: null,
                editingEquipmentId: null,
                draggingIcon: null
            };
            document.getElementById('floor-select').value = state.currentFloor;
            const imageUrl = state.plantImages[state.currentFloor];
            if (imageUrl) {
                displayPlant(imageUrl);
            } else {
                document.getElementById('upload-section').style.display = 'flex';
                document.getElementById('plant-section').style.display = 'none';
            }
            updateAreasList();
            saveToStorage();
            alert('Dados importados com sucesso.');
        } catch (err) {
            alert('Erro ao importar dados: ' + err.message);
        } finally {
            e.target.value = '';
        }
    };
    reader.readAsText(file);
}

function handleFileUpload(e) {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
            state.plantImages[state.currentFloor] = event.target.result;
            displayPlant(event.target.result);
            saveToStorage();
        };
        reader.readAsDataURL(file);
    }
}

function handleDrop(e) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
            state.plantImages[state.currentFloor] = event.target.result;
            displayPlant(event.target.result);
            saveToStorage();
        };
        reader.readAsDataURL(file);
    }
}

function displayPlant(imageUrl) {
    document.getElementById('upload-section').style.display = 'none';
    document.getElementById('plant-section').style.display = 'block';
    const img = document.getElementById('plant-image');
    img.src = imageUrl;
    img.onload = () => {
        const maxH = window.innerHeight - 250;
        const maxW = window.innerWidth - 400;
        let w = img.naturalWidth, h = img.naturalHeight;
        if (h > maxH) { w = w * (maxH / h); h = maxH; }
        if (w > maxW) { h = h * (maxW / w); w = maxW; }
        img.style.width = w + 'px';
        img.style.height = h + 'px';
        updateAreasOverlay();
    };
}

function handleFloorChange(e) {
    state.currentFloor = parseInt(e.target.value);
    state.currentAreaId = null;
    const url = state.plantImages[state.currentFloor];
    if (url) displayPlant(url);
    else {
        document.getElementById('upload-section').style.display = 'flex';
        document.getElementById('plant-section').style.display = 'none';
    }
    updateAreasList();
    closeSidebar();
    saveToStorage();
}

function openAreaModal() {
    if (!state.plantImages[state.currentFloor]) {
        alert('Por favor, faça upload da planta primeiro!');
        return;
    }
    document.getElementById('area-modal').classList.add('active');
    document.getElementById('area-name-input').value = '';
    document.getElementById('area-type-input').value = 'consultorio';
    state.isDrawing = false;
    state.drawingStart = null;
    state.tempAreaCoords = null;
    activateDrawingMode();
}

function activateDrawingMode() {
    const overlay = document.getElementById('areas-overlay');
    overlay.classList.add('active');
    overlay.style.pointerEvents = 'all';
    overlay.style.cursor = 'crosshair';
    overlay.onmousedown = startDrawing;
    overlay.onmousemove = drawArea;
    overlay.onmouseup = stopDrawing;
}

function startDrawing(e) {
    e.preventDefault();
    state.isDrawing = true;
    const overlay = e.currentTarget;
    const img = document.getElementById('plant-image');
    if (!img.complete || !img.naturalWidth) { state.isDrawing = false; return; }
    const pt = overlay.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPt = pt.matrixTransform(overlay.getScreenCTM().inverse());
    state.drawingStart = { x: svgPt.x, y: svgPt.y };
}

function drawArea(e) {
    if (!state.isDrawing || !state.drawingStart) return;
    e.preventDefault();
    const overlay = e.currentTarget;
    const img = document.getElementById('plant-image');
    if (!img.complete || !img.naturalWidth) return;
    const pt = overlay.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPt = pt.matrixTransform(overlay.getScreenCTM().inverse());
    const cx = svgPt.x, cy = svgPt.y;
    const w = Math.abs(cx - state.drawingStart.x);
    const h = Math.abs(cy - state.drawingStart.y);
    const x = Math.min(state.drawingStart.x, cx);
    const y = Math.min(state.drawingStart.y, cy);
    let tr = document.getElementById('temp-rect');
    if (!tr) {
        tr = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        tr.id = 'temp-rect';
        tr.setAttribute('fill', 'rgba(37, 99, 235, 0.3)');
        tr.setAttribute('stroke', '#2563eb');
        tr.setAttribute('stroke-width', '3');
        tr.setAttribute('stroke-dasharray', '5,5');
        overlay.appendChild(tr);
    }
    tr.setAttribute('x', x);
    tr.setAttribute('y', y);
    tr.setAttribute('width', w);
    tr.setAttribute('height', h);
}

function stopDrawing(e) {
    if (!state.isDrawing || !state.drawingStart) return;
    e.preventDefault();
    state.isDrawing = false;
    const overlay = e.currentTarget;
    const img = document.getElementById('plant-image');
    if (!img.complete || !img.naturalWidth) { state.drawingStart = null; return; }
    const pt = overlay.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPt = pt.matrixTransform(overlay.getScreenCTM().inverse());
    const cx = svgPt.x, cy = svgPt.y;
    const w = Math.abs(cx - state.drawingStart.x);
    const h = Math.abs(cy - state.drawingStart.y);
    document.getElementById('temp-rect')?.remove();
    if (w < 20 || h < 20) {
        state.drawingStart = null;
        alert('Área muito pequena!');
        return;
    }
    state.tempAreaCoords = {
        x: Math.min(state.drawingStart.x, cx),
        y: Math.min(state.drawingStart.y, cy),
        width: w,
        height: h
    };
    state.drawingStart = null;
}

function closeAreaModal() {
    document.getElementById('area-modal').classList.remove('active');
    const overlay = document.getElementById('areas-overlay');
    overlay.classList.remove('active');
    overlay.style.pointerEvents = 'none';
    overlay.style.cursor = 'default';
    overlay.onmousedown = null;
    overlay.onmousemove = null;
    overlay.onmouseup = null;
    document.getElementById('temp-rect')?.remove();
    state.isDrawing = false;
    state.drawingStart = null;
    state.tempAreaCoords = null;
    updateAreasOverlay();
}

window.closeAreaModal = closeAreaModal;

function saveArea() {
    const name = document.getElementById('area-name-input').value.trim();
    const type = document.getElementById('area-type-input').value;
    if (!name) { alert('Por favor, informe o nome da área!'); return; }
    if (!state.tempAreaCoords) { alert('Por favor, desenhe a área na planta!'); return; }
    const area = {
        id: Date.now().toString(),
        name: name,
        type: type,
        coords: state.tempAreaCoords,
        notebooks: [],
        printers: []
    };
    state.areas[state.currentFloor].push(area);
    state.tempAreaCoords = null;
    state.isDrawing = false;
    state.drawingStart = null;
    closeAreaModal();
    updateAreasOverlay();
    updateAreasList();
    saveToStorage();
}

window.saveArea = saveArea;

function updateAreasOverlay() {
    const overlay = document.getElementById('areas-overlay');
    const img = document.getElementById('plant-image');
    if (!img.complete || !img.naturalWidth || !img.naturalHeight) {
        if (!img.complete) img.onload = updateAreasOverlay;
        return;
    }
    const isModalOpen = document.getElementById('area-modal').classList.contains('active');
    const tempRect = document.getElementById('temp-rect');
    overlay.innerHTML = '';
    if (isModalOpen && tempRect && tempRect.parentNode) {
        overlay.appendChild(tempRect.cloneNode(true));
    }
    const wrapper = document.querySelector('.plant-wrapper');
    const wrapperRect = wrapper.getBoundingClientRect();
    
    // Usar dimensões do wrapper para cobrir toda a área disponível
    overlay.setAttribute('viewBox', `0 0 ${img.naturalWidth} ${img.naturalHeight}`);
    overlay.setAttribute('width', '100%');
    overlay.setAttribute('height', '100%');
    overlay.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    
    state.areas[state.currentFloor].forEach(area => {
        const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        r.setAttribute('x', area.coords.x);
        r.setAttribute('y', area.coords.y);
        r.setAttribute('width', area.coords.width);
        r.setAttribute('height', area.coords.height);
        r.setAttribute('class', 'area-rect');
        r.setAttribute('data-area-id', area.id);
        const isSelected = state.currentAreaId === area.id;
        if (isSelected) r.classList.add('selected');
        
        if (!isModalOpen) {
            r.style.pointerEvents = 'all';
            r.style.cursor = 'pointer';
            r.onclick = () => selectArea(area.id);
        } else {
            r.style.pointerEvents = 'none';
        }
        overlay.appendChild(r);
        
        // Adicionar handles de redimensionamento se a área estiver selecionada
        if (isSelected && !isModalOpen) {
            const handleSize = 12;
            const handles = [
                { x: area.coords.x, y: area.coords.y, cursor: 'nw-resize', type: 'nw' },
                { x: area.coords.x + area.coords.width, y: area.coords.y, cursor: 'ne-resize', type: 'ne' },
                { x: area.coords.x, y: area.coords.y + area.coords.height, cursor: 'sw-resize', type: 'sw' },
                { x: area.coords.x + area.coords.width, y: area.coords.y + area.coords.height, cursor: 'se-resize', type: 'se' },
                { x: area.coords.x + area.coords.width / 2, y: area.coords.y, cursor: 'n-resize', type: 'n' },
                { x: area.coords.x + area.coords.width / 2, y: area.coords.y + area.coords.height, cursor: 's-resize', type: 's' },
                { x: area.coords.x, y: area.coords.y + area.coords.height / 2, cursor: 'w-resize', type: 'w' },
                { x: area.coords.x + area.coords.width, y: area.coords.y + area.coords.height / 2, cursor: 'e-resize', type: 'e' }
            ];
            
            handles.forEach(handle => {
                const h = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                h.setAttribute('cx', handle.x);
                h.setAttribute('cy', handle.y);
                h.setAttribute('r', handleSize / 2);
                h.setAttribute('class', 'resize-handle');
                h.setAttribute('data-area-id', area.id);
                h.setAttribute('data-handle-type', handle.type);
                h.style.fill = '#2563eb';
                h.style.stroke = '#ffffff';
                h.style.strokeWidth = '2';
                h.style.cursor = handle.cursor;
                h.style.pointerEvents = 'all';
                
                // Event listener para iniciar redimensionamento
                h.addEventListener('mousedown', (e) => {
                    e.stopPropagation();
                    const overlay = document.getElementById('areas-overlay');
                    const svgPoint = overlay.createSVGPoint();
                    svgPoint.x = e.clientX;
                    svgPoint.y = e.clientY;
                    const ctm = overlay.getScreenCTM();
                    if (ctm) {
                        const svgCoords = svgPoint.matrixTransform(ctm.inverse());
                        window.resizeState.isResizing = true;
                        window.resizeState.handle = h;
                        window.resizeState.area = area;
                        window.resizeState.startCoords = {
                            x: area.coords.x,
                            y: area.coords.y,
                            width: area.coords.width,
                            height: area.coords.height
                        };
                        window.resizeState.startMouse = { x: svgCoords.x, y: svgCoords.y };
                    }
                });
                
                overlay.appendChild(h);
            });
        }
        
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', area.coords.x + area.coords.width / 2);
        label.setAttribute('y', area.coords.y + area.coords.height / 2);
        label.setAttribute('class', 'area-label');
        label.textContent = area.name;
        overlay.appendChild(label);

        // Botão único "+" para abrir todas as informações da área
        const plusSize = 80;
        const plusGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        plusGroup.setAttribute('class', 'equipment-icon');
        plusGroup.style.cursor = 'pointer';
        plusGroup.style.pointerEvents = 'all';
        plusGroup.setAttribute('transform', `translate(${area.coords.x + 12}, ${area.coords.y + 12})`);

        const plusBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        plusBg.setAttribute('x', 0);
        plusBg.setAttribute('y', 0);
        plusBg.setAttribute('width', plusSize);
        plusBg.setAttribute('height', plusSize);
        plusBg.setAttribute('rx', 16);
        plusBg.setAttribute('fill', '#0ea5e9');
        plusBg.setAttribute('stroke', '#0284c7');
        plusBg.setAttribute('stroke-width', '4');

        const plusVertical = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        plusVertical.setAttribute('x', plusSize * 0.45);
        plusVertical.setAttribute('y', plusSize * 0.18);
        plusVertical.setAttribute('width', plusSize * 0.1);
        plusVertical.setAttribute('height', plusSize * 0.64);
        plusVertical.setAttribute('rx', 6);
        plusVertical.setAttribute('fill', '#ffffff');

        const plusHorizontal = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        plusHorizontal.setAttribute('x', plusSize * 0.18);
        plusHorizontal.setAttribute('y', plusSize * 0.45);
        plusHorizontal.setAttribute('width', plusSize * 0.64);
        plusHorizontal.setAttribute('height', plusSize * 0.1);
        plusHorizontal.setAttribute('rx', 6);
        plusHorizontal.setAttribute('fill', '#ffffff');

        plusGroup.appendChild(plusBg);
        plusGroup.appendChild(plusVertical);
        plusGroup.appendChild(plusHorizontal);
        overlay.appendChild(plusGroup);

        plusGroup.addEventListener('click', (e) => {
            e.stopPropagation();
            openAreaInfoModal(area.id);
        });
    });
    
    if (isModalOpen) {
        setTimeout(activateDrawingMode, 10);
    } else {
        overlay.style.pointerEvents = 'none';
    }
}

function selectArea(areaId) {
    if (document.getElementById('area-modal').classList.contains('active')) return;
    state.currentAreaId = areaId;
    updateAreasOverlay();
    
    // Garantir que a sidebar está visível
    const sidebar = document.getElementById('sidebar');
    sidebar.style.display = 'flex';
    sidebar.style.visibility = 'visible';
    
    showAreaDetails(areaId);
}

function showAreaDetails(areaId) {
    const area = state.areas[state.currentFloor].find(a => a.id === areaId);
    if (!area) return;
    
    // Garantir que a sidebar está visível
    const sidebar = document.getElementById('sidebar');
    sidebar.style.display = 'flex';
    sidebar.style.visibility = 'visible';
    
    document.getElementById('sidebar-title').textContent = 'Detalhes da Área';
    document.getElementById('areas-list').style.display = 'none';
    
    const areaDetails = document.getElementById('area-details');
    areaDetails.style.display = 'block';
    areaDetails.style.visibility = 'visible';
    
    document.getElementById('area-name').textContent = area.name;

    // Preview da imagem da área (apenas na sidebar, não na planta)
    const imgPrev = document.getElementById('area-image-preview');
    if (imgPrev) {
        if (area.image) {
            imgPrev.innerHTML = `<img src="${area.image}" alt="Imagem da área" style="max-width:100%; max-height:150px; display:block; border:1px solid var(--border-color); border-radius:8px; margin-bottom:0.5rem;">`;
        } else {
            imgPrev.textContent = 'Nenhuma imagem enviada';
        }
    }
    
    const nbList = document.getElementById('notebooks-list');
    nbList.innerHTML = '';
    if (area.notebooks.length === 0) {
        nbList.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.875rem;">Nenhum notebook cadastrado</p>';
    } else {
        area.notebooks.forEach((n, i) => nbList.appendChild(createEquipmentItem(n, 'notebook', i)));
    }
    
    const prList = document.getElementById('printers-list');
    prList.innerHTML = '';
    if (area.printers.length === 0) {
        prList.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.875rem;">Nenhuma impressora cadastrada</p>';
    } else {
        area.printers.forEach((p, i) => prList.appendChild(createEquipmentItem(p, 'printer', i)));
    }
}

function createEquipmentItem(eq, type, idx) {
    const div = document.createElement('div');
    div.className = 'equipment-item';
    const h = document.createElement('div');
    h.className = 'equipment-item-header';
    const n = document.createElement('div');
    n.className = 'equipment-item-name';
    
    // Para notebook mostra o nome, para impressora mostra o modelo
    if (type === 'notebook') {
        n.textContent = eq.name || 'Sem nome';
    } else {
        n.textContent = eq.model || 'Sem modelo';
    }
    
    const db = document.createElement('button');
    db.className = 'equipment-item-delete';
    db.textContent = '×';
    db.onclick = () => deleteEquipment(type, idx);
    h.appendChild(n);
    h.appendChild(db);
    const info = document.createElement('div');
    info.className = 'equipment-item-info';
    
    if (type === 'notebook') {
        const parts = [];
        if (eq.anydesk) parts.push(`Anydesk: ${eq.anydesk}`);
        if (eq.kaspersky) parts.push(`Kaspersky: ${eq.kaspersky}`);
        if (eq.status) {
            const statusText = eq.status === 'ativo' ? 'Ativo' : eq.status === 'inativo' ? 'Inativo' : 'Em Manutenção';
            parts.push(`Status: ${statusText}`);
        }
        if (eq.storage) parts.push(`Armazenamento: ${eq.storage}`);
        info.textContent = parts.join(' • ') || 'Sem informações adicionais';
    } else {
        info.textContent = 'Impressora';
    }
    
    div.appendChild(h);
    div.appendChild(info);
    return div;
}

function updateAreasList() {
    const list = document.getElementById('areas-list');
    list.innerHTML = '';
    if (state.areas[state.currentFloor].length === 0) {
        list.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 2rem;">Nenhuma área cadastrada ainda</p>';
        return;
    }
    state.areas[state.currentFloor].forEach(area => {
        const item = document.createElement('div');
        item.className = 'area-item';
        if (state.currentAreaId === area.id) item.classList.add('active');
        item.innerHTML = `<h3>${area.name}</h3><div class="area-type">${area.type}</div>`;
        item.onclick = () => selectArea(area.id);
        list.appendChild(item);
    });
    document.getElementById('sidebar-title').textContent = 'Áreas';
    document.getElementById('areas-list').style.display = 'block';
    document.getElementById('area-details').style.display = 'none';
}

function openSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.style.display = 'flex';
    sidebar.style.visibility = 'visible';
    updateAreasList();
}

function closeSidebar() {
    state.currentAreaId = null;
    updateAreasOverlay();
    document.getElementById('sidebar').style.display = 'none';
}

function addEquipment(type) {
    if (!state.currentAreaId) return;
    state.currentEquipmentType = type;
    state.editingEquipmentId = null;
    document.getElementById('equipment-modal-title').textContent = type === 'notebook' ? 'Adicionar Notebook' : 'Adicionar Impressora';
    
    // Mostrar/ocultar campos baseado no tipo
    const notebookFields = document.getElementById('notebook-fields');
    const printerFields = document.getElementById('printer-fields');
    
    if (type === 'notebook') {
        notebookFields.style.display = 'block';
        printerFields.style.display = 'none';
        document.getElementById('equipment-name-input').value = '';
        document.getElementById('equipment-anydesk-input').value = '';
        document.getElementById('equipment-kaspersky-input').value = '';
        document.getElementById('equipment-status-input').value = 'ativo';
        document.getElementById('equipment-storage-input').value = '';
    } else {
        notebookFields.style.display = 'none';
        printerFields.style.display = 'block';
        document.getElementById('equipment-model-input').value = '';
    }
    
    document.getElementById('equipment-modal').classList.add('active');
}

function closeEquipmentModal() {
    document.getElementById('equipment-modal').classList.remove('active');
    state.currentEquipmentType = null;
    state.editingEquipmentId = null;
    // Limpar campos
    document.getElementById('equipment-name-input').value = '';
    document.getElementById('equipment-anydesk-input').value = '';
    document.getElementById('equipment-kaspersky-input').value = '';
    document.getElementById('equipment-status-input').value = 'ativo';
    document.getElementById('equipment-storage-input').value = '';
    document.getElementById('equipment-model-input').value = '';
}

function saveEquipment() {
    if (!state.currentAreaId || !state.currentEquipmentType) return;
    
    let eq;
    
    if (state.currentEquipmentType === 'notebook') {
        const name = document.getElementById('equipment-name-input').value.trim();
        const anydesk = document.getElementById('equipment-anydesk-input').value.trim();
        const kaspersky = document.getElementById('equipment-kaspersky-input').value.trim();
        const status = document.getElementById('equipment-status-input').value;
        const storage = document.getElementById('equipment-storage-input').value.trim();
        if (!name) { alert('Por favor, informe o nome da máquina!'); return; }
        eq = {
            id: state.editingEquipmentId || Date.now().toString(),
            name: name,
            anydesk: anydesk || null,
            kaspersky: kaspersky || null,
            status: status || 'ativo',
            storage: storage || null
        };
    } else {
        const model = document.getElementById('equipment-model-input').value.trim();
        if (!model) { alert('Por favor, informe o modelo da impressora!'); return; }
        eq = {
            id: state.editingEquipmentId || Date.now().toString(),
            model: model
        };
    }
    const area = state.areas[state.currentFloor].find(a => a.id === state.currentAreaId);
    if (area) {
        const list = state.currentEquipmentType === 'notebook' ? area.notebooks : area.printers;
        if (state.editingEquipmentId) {
            const idx = list.findIndex(e => e.id === state.editingEquipmentId);
            if (idx !== -1) list[idx] = eq;
        } else {
            list.push(eq);
        }
        showAreaDetails(state.currentAreaId);
        saveToStorage();
        updateAreasOverlay(); // Atualizar visualização dos ícones
    }
    closeEquipmentModal();
}

function deleteEquipment(type, idx) {
    if (!confirm('Tem certeza que deseja excluir este equipamento?')) return;
    const area = state.areas[state.currentFloor].find(a => a.id === state.currentAreaId);
    if (area) {
        const list = type === 'notebook' ? area.notebooks : area.printers;
        list.splice(idx, 1);
        showAreaDetails(state.currentAreaId);
        saveToStorage();
    }
}

function deleteArea() {
    if (!state.currentAreaId) { alert('Nenhuma área selecionada para excluir.'); return; }
    if (!confirm('Tem certeza que deseja excluir esta área? Todos os equipamentos serão removidos.')) return;
    const idx = state.areas[state.currentFloor].findIndex(a => a.id === state.currentAreaId);
    if (idx !== -1) {
        state.areas[state.currentFloor].splice(idx, 1);
        state.currentAreaId = null;
        updateAreasOverlay();
        updateAreasList();
        closeSidebar();
        saveToStorage();
    }
}

function resetPlant() {
    if (!confirm('Tem certeza que deseja resetar? Isso irá remover a imagem e todas as áreas do andar atual!')) return;
    state.plantImages[state.currentFloor] = null;
    state.areas[state.currentFloor] = [];
    state.currentAreaId = null;
    state.isDrawing = false;
    state.drawingStart = null;
    state.tempAreaCoords = null;
    document.getElementById('plant-image').src = '';
    document.getElementById('plant-image').style.width = '';
    document.getElementById('plant-image').style.height = '';
    document.getElementById('upload-section').style.display = 'flex';
    document.getElementById('plant-section').style.display = 'none';
    document.getElementById('areas-overlay').innerHTML = '';
    closeAreaModal();
    closeEquipmentModal();
    closeSidebar();
    updateAreasList();
    saveToStorage();
}

function showEquipmentDetails(equipment, type, areaName, iconX, iconY) {
    const modal = document.getElementById('equipment-view-modal');
    const modalContent = modal.querySelector('.modal-content');
    const title = document.getElementById('equipment-view-title');
    const body = document.getElementById('equipment-view-body');
    
    title.textContent = type === 'notebook' ? '💻 Detalhes do Notebook' : '🖨️ Detalhes da Impressora';
    
    let html = `<div style="margin-bottom: 1rem;"><strong>Área:</strong> ${areaName}</div>`;
    
    if (type === 'notebook') {
        html += `
            <div class="equipment-detail-item">
                <strong>Nome da Máquina:</strong> ${equipment.name || 'Não informado'}
            </div>
            <div class="equipment-detail-item">
                <strong>Anydesk:</strong> ${equipment.anydesk || 'Não informado'}
            </div>
            <div class="equipment-detail-item">
                <strong>Kaspersky:</strong> ${equipment.kaspersky || 'Não informado'}
            </div>
            <div class="equipment-detail-item">
                <strong>Status:</strong> ${equipment.status === 'ativo' ? 'Ativo' : equipment.status === 'inativo' ? 'Inativo' : 'Em Manutenção'}
            </div>
            <div class="equipment-detail-item">
                <strong>Armazenamento:</strong> ${equipment.storage || 'Não informado'}
            </div>
        `;
    } else {
        html += `
            <div class="equipment-detail-item">
                <strong>Modelo:</strong> ${equipment.model || 'Não informado'}
            </div>
        `;
    }
    
    body.innerHTML = html;
    
    // Posicionar modal próximo ao ícone, sem cortar conteúdo
    if (iconX !== undefined && iconY !== undefined) {
        const modalWidth = 280; // mesmo limite definido no CSS para o modal de visualização
        const modalHeightGuess = 260; // estimativa para evitar corte acima
        const margin = 12;
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

        const left = Math.min(
            viewportWidth - modalWidth / 2 - margin,
            Math.max(modalWidth / 2 + margin, iconX)
        );
        const top = Math.max(margin, iconY - modalHeightGuess);

        modalContent.style.position = 'fixed';
        modalContent.style.left = `${left}px`;
        modalContent.style.top = `${top}px`;
        modalContent.style.transform = 'translate(-50%, 0)';
        modalContent.style.margin = '0';
    } else {
        modalContent.style.position = '';
        modalContent.style.left = '';
        modalContent.style.top = '';
        modalContent.style.transform = '';
        modalContent.style.margin = '';
    }
    
    modal.classList.add('active');
}

function closeEquipmentViewModal() {
    document.getElementById('equipment-view-modal').classList.remove('active');
}

function openAreaInfoModal(areaId) {
    const area = state.areas[state.currentFloor].find(a => a.id === areaId);
    if (!area) return;

    const modal = document.getElementById('area-info-modal');
    const title = document.getElementById('area-info-title');
    const body = document.getElementById('area-info-body');

    title.textContent = `Informações da Área: ${area.name}`;

    const statusLabel = (s) => s === 'ativo' ? 'Ativo' : s === 'inativo' ? 'Inativo' : 'Em Manutenção';

    const notebookList = area.notebooks.length === 0
        ? '<p style="color: var(--text-secondary);">Nenhum notebook cadastrado</p>'
        : area.notebooks.map(n => `
            <div class="area-info-item" style="border: 1px solid #000; padding: 0.75rem; border-radius: 8px; margin-bottom: 0.5rem;">
                <div class="area-info-title" style="font-weight: 600;">${n.name || 'Sem nome'}</div>
                <div class="area-info-meta" style="margin-top: 0.35rem; line-height: 1.4;">
                    ${n.anydesk ? `<div>Anydesk: ${n.anydesk}</div>` : ''}
                    ${n.kaspersky ? `<div>Kaspersky: ${n.kaspersky}</div>` : ''}
                    ${n.status ? `<div>Status: ${statusLabel(n.status)}</div>` : ''}
                    ${n.storage ? `<div>Armazenamento: ${n.storage}</div>` : ''}
                </div>
            </div>
        `).join('');

    const printerList = area.printers.length === 0
        ? '<p style="color: var(--text-secondary);">Nenhuma impressora cadastrada</p>'
        : area.printers.map(p => `
            <div class="area-info-item">
                <div class="area-info-title">${p.model || 'Sem modelo'}</div>
                <div class="area-info-meta">Impressora</div>
            </div>
        `).join('');

    const imageSection = area.image
        ? `<div style="margin-top: 0.5rem; display:flex; justify-content:center;">
                <img src="${area.image}" alt="Imagem da área" style="max-width: 100%; max-height: 60vh; border-radius: 8px; box-shadow: var(--shadow-lg);">
           </div>`
        : '<p style="color: var(--text-secondary); margin-top: 0.5rem;">Nenhuma imagem enviada</p>';

    body.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:1rem;">
            <div>
                <div class="area-info-title" style="font-size:1.1rem;">${area.name}</div>
                <div class="area-info-meta" style="text-transform: capitalize;">${area.type}</div>
            </div>
            <div>
                <h3 style="margin:0 0 0.5rem 0;">Notebooks</h3>
                ${notebookList}
            </div>
            <div>
                <h3 style="margin:0 0 0.5rem 0;">Impressoras</h3>
                ${printerList}
            </div>
            <div>
                <h3 style="margin:0 0 0.5rem 0;">Imagem da área</h3>
                ${imageSection}
            </div>
        </div>
    `;

    modal.classList.add('active');
}

function closeAreaInfoModal() {
    document.getElementById('area-info-modal').classList.remove('active');
}

function showAreaImageModal(imageData, areaName, iconX, iconY) {
    const modal = document.getElementById('area-image-modal');
    const modalContent = modal.querySelector('.modal-content');
    const title = document.getElementById('area-image-title');
    const body = document.getElementById('area-image-body');

    title.textContent = `Imagem da Área: ${areaName}`;
    body.innerHTML = `<img src="${imageData}" alt="Imagem da área" style="max-width: 90vw; max-height: 80vh; border-radius: 8px; box-shadow: var(--shadow-lg);">`;

    if (iconX !== undefined && iconY !== undefined) {
        const modalWidth = 320;
        const margin = 12;
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
        const left = Math.min(
            viewportWidth - modalWidth / 2 - margin,
            Math.max(modalWidth / 2 + margin, iconX)
        );
        modalContent.style.position = 'fixed';
        modalContent.style.left = `${left}px`;
        modalContent.style.top = `${iconY + 16}px`;
        modalContent.style.transform = 'translate(-50%, 0)';
        modalContent.style.margin = '0';
    } else {
        modalContent.style.position = '';
        modalContent.style.left = '';
        modalContent.style.top = '';
        modalContent.style.transform = '';
        modalContent.style.margin = '';
    }

    modal.classList.add('active');
}

function closeAreaImageModal() {
    document.getElementById('area-image-modal').classList.remove('active');
}

window.addEquipment = addEquipment;
window.deleteArea = deleteArea;
window.resetPlant = resetPlant;
window.closeEquipmentViewModal = closeEquipmentViewModal;
window.triggerAreaImageUpload = triggerAreaImageUpload;
window.removeAreaImage = removeAreaImage;
window.closeAreaImageModal = closeAreaImageModal;
window.openAreaInfoModal = openAreaInfoModal;
window.closeAreaInfoModal = closeAreaInfoModal;

// Persistência local + API
async function saveToApi() {
    try {
        const response = await fetch(`${API_URL}/data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(state)
        });
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        console.log('Dados salvos na API com sucesso');
        return true;
    } catch (err) {
        console.error('Falha ao salvar na API:', err.message);
        return false;
    }
}

async function saveToStorage() {
    // Tenta salvar na API primeiro (prioridade)
    const apiSaved = await saveToApi();
    
    // Fallback para localStorage se API falhar
    if (!apiSaved) {
        try {
            localStorage.setItem('clinicPlantData', JSON.stringify(state));
            console.log('Dados salvos no localStorage como fallback');
        } catch (e) {
            console.error('Erro ao salvar dados no localStorage:', e);
        }
    } else {
        // Também salva no localStorage como backup
        try {
            localStorage.setItem('clinicPlantData', JSON.stringify(state));
        } catch (e) {
            // Ignora erro do localStorage se API funcionou
        }
    }
}

async function loadFromStorage() {
    let loaded = false;
    // Tenta API primeiro
    try {
        console.log('Tentando carregar dados da API:', `${API_URL}/data`);
        const res = await fetch(`${API_URL}/data`);
        console.log('Resposta da API:', res.status, res.statusText);
        if (res.ok) {
            const data = await res.json();
            console.log('Dados carregados da API:', {
                areas: Object.keys(data.areas || {}).reduce((sum, floor) => sum + (data.areas[floor]?.length || 0), 0),
                hasImage1: !!data.plantImages?.[1],
                hasImage2: !!data.plantImages?.[2]
            });
            state.areas = data.areas || state.areas;
            state.plantImages = data.plantImages || state.plantImages;
            state.currentFloor = data.currentFloor || 1;
            loaded = true;
        } else {
            console.warn('API retornou erro:', res.status, res.statusText);
        }
    } catch (err) {
        console.warn('Falha ao carregar da API, tentando localStorage:', err.message);
    }

    if (!loaded) {
        try {
            const saved = localStorage.getItem('clinicPlantData');
            if (saved) {
                const parsed = JSON.parse(saved);
                state.areas = parsed.areas || state.areas;
                state.plantImages = parsed.plantImages || state.plantImages;
                state.currentFloor = parsed.currentFloor || 1;
            }
        } catch (e) {
            console.error('Erro ao carregar dados do localStorage:', e);
        }
    }

    document.getElementById('floor-select').value = state.currentFloor;
    const url = state.plantImages[state.currentFloor];
    if (url) {
        displayPlant(url);
    } else {
        document.getElementById('upload-section').style.display = 'flex';
        document.getElementById('plant-section').style.display = 'none';
    }
    updateAreasList();
    // Garantir que o overlay seja atualizado mesmo se não houver imagem
    setTimeout(() => {
        updateAreasOverlay();
    }, 100);
}

// ---------- Imagem por área ----------
function triggerAreaImageUpload() {
    if (!state.currentAreaId) return;
    const input = document.getElementById('area-image-input');
    if (input) input.click();
}

// Ler imagem ao selecionar arquivo
document.getElementById('area-image-input')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        const area = state.areas[state.currentFloor].find(a => a.id === state.currentAreaId);
        if (area) {
            area.image = ev.target.result; // base64
            updateAreasOverlay();
            showAreaDetails(area.id);
            saveToStorage();
        }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
});

function removeAreaImage() {
    if (!state.currentAreaId) return;
    const area = state.areas[state.currentFloor].find(a => a.id === state.currentAreaId);
    if (area && area.image) {
        area.image = null;
        updateAreasOverlay();
        showAreaDetails(area.id);
        saveToStorage();
    }
}