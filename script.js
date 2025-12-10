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

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('file-input').addEventListener('change', handleFileUpload);
    document.getElementById('floor-select').addEventListener('change', handleFloorChange);
    document.getElementById('add-area-btn').addEventListener('click', openAreaModal);
    document.getElementById('upload-btn').addEventListener('click', () => document.getElementById('file-input').click());
    document.getElementById('reset-btn').addEventListener('click', resetPlant);
    document.getElementById('close-sidebar').addEventListener('click', closeSidebar);
    
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
    
    loadFromStorage();
});

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
        
        // Adicionar ícones de equipamentos
        const iconSize = 100;
        
        // Ícones de notebooks (computador)
        area.notebooks.forEach((notebook, idx) => {
            // Usar posição salva ou posição padrão
            const iconX = notebook.iconX !== undefined ? notebook.iconX : area.coords.x + 20;
            const iconY = notebook.iconY !== undefined ? notebook.iconY : area.coords.y + 80;
            
            const iconGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            iconGroup.setAttribute('class', 'equipment-icon');
            iconGroup.setAttribute('data-type', 'notebook');
            iconGroup.setAttribute('data-area-id', area.id);
            iconGroup.setAttribute('data-index', idx);
            iconGroup.style.cursor = 'move';
            iconGroup.style.pointerEvents = 'all';
            iconGroup.setAttribute('transform', `translate(${iconX}, ${iconY})`);
            
            // Ícone de notebook/laptop - tela
            const screenHeight = iconSize * 0.5;
            const baseHeight = iconSize * 0.3;
            
            // Tela do notebook
            const screen = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            screen.setAttribute('x', 0);
            screen.setAttribute('y', 0);
            screen.setAttribute('width', iconSize);
            screen.setAttribute('height', screenHeight);
            screen.setAttribute('rx', '3');
            screen.setAttribute('fill', '#2563eb');
            screen.setAttribute('stroke', '#1e40af');
            screen.setAttribute('stroke-width', '2');
            
            // Área interna da tela
            const screenInner = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            screenInner.setAttribute('x', 4);
            screenInner.setAttribute('y', 4);
            screenInner.setAttribute('width', iconSize - 8);
            screenInner.setAttribute('height', screenHeight - 8);
            screenInner.setAttribute('rx', '2');
            screenInner.setAttribute('fill', '#60a5fa');
            
            // Base/teclado do notebook
            const base = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            base.setAttribute('x', 0);
            base.setAttribute('y', screenHeight - 2);
            base.setAttribute('width', iconSize);
            base.setAttribute('height', baseHeight);
            base.setAttribute('rx', '3');
            base.setAttribute('fill', '#1e40af');
            base.setAttribute('stroke', '#1e3a8a');
            base.setAttribute('stroke-width', '2');
            
            // Linha divisória entre tela e base
            const divider = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            divider.setAttribute('x1', 0);
            divider.setAttribute('y1', screenHeight - 2);
            divider.setAttribute('x2', iconSize);
            divider.setAttribute('y2', screenHeight - 2);
            divider.setAttribute('stroke', '#1e3a8a');
            divider.setAttribute('stroke-width', '2');
            
            // Teclas (pequenos retângulos)
            const keyWidth = iconSize / 8;
            const keyHeight = baseHeight / 3;
            const keySpacing = keyWidth * 0.2;
            for (let i = 0; i < 6; i++) {
                const key = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                key.setAttribute('x', (iconSize / 8) + i * (keyWidth + keySpacing));
                key.setAttribute('y', screenHeight + (baseHeight / 3));
                key.setAttribute('width', keyWidth);
                key.setAttribute('height', keyHeight);
                key.setAttribute('rx', '1');
                key.setAttribute('fill', '#3b82f6');
                iconGroup.appendChild(key);
            }
            
            iconGroup.appendChild(screen);
            iconGroup.appendChild(screenInner);
            iconGroup.appendChild(base);
            iconGroup.appendChild(divider);
            overlay.appendChild(iconGroup);
            
            // Drag and drop
            let iconPos = { x: iconX, y: iconY };
            let dragStartPos = null;
            
            iconGroup.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                dragStartPos = { x: e.clientX, y: e.clientY };
                const svgPoint = overlay.createSVGPoint();
                svgPoint.x = e.clientX;
                svgPoint.y = e.clientY;
                const ctm = overlay.getScreenCTM();
                if (ctm) {
                    const svgCoords = svgPoint.matrixTransform(ctm.inverse());
                    window.globalDragState.isDragging = true;
                    window.globalDragState.iconGroup = iconGroup;
                    window.globalDragState.dragStart = { x: svgCoords.x - iconPos.x, y: svgCoords.y - iconPos.y };
                    window.globalDragState.iconPos = { x: iconPos.x, y: iconPos.y };
                    window.globalDragState.area = area;
                    window.globalDragState.equipment = notebook;
                    window.globalDragState.equipment.type = 'notebook';
                    window.globalDragState.iconSize = iconSize;
                }
            });
            
            iconGroup.addEventListener('mouseup', () => {
                if (window.globalDragState.isDragging && window.globalDragState.iconGroup === iconGroup) {
                    iconPos = { ...window.globalDragState.iconPos };
                }
            });
            
            iconGroup.addEventListener('click', (e) => {
                e.stopPropagation();
                if (dragStartPos) {
                    const dragDistance = Math.sqrt(
                        Math.pow(e.clientX - dragStartPos.x, 2) + 
                        Math.pow(e.clientY - dragStartPos.y, 2)
                    );
                    if (dragDistance < 5) { // Se moveu menos de 5px, é um clique
                        const rect = iconGroup.getBoundingClientRect();
                        showEquipmentDetails(notebook, 'notebook', area.name, rect.left + rect.width / 2, rect.top);
                    }
                }
                dragStartPos = null;
            });
        });
        
        // Ícones de impressoras
        area.printers.forEach((printer, idx) => {
            // Usar posição salva ou posição padrão
            const iconX = printer.iconX !== undefined ? printer.iconX : area.coords.x + 20;
            const iconY = printer.iconY !== undefined ? printer.iconY : area.coords.y + 80;
            
            const iconGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            iconGroup.setAttribute('class', 'equipment-icon');
            iconGroup.setAttribute('data-type', 'printer');
            iconGroup.setAttribute('data-area-id', area.id);
            iconGroup.setAttribute('data-index', idx);
            iconGroup.style.cursor = 'move';
            iconGroup.style.pointerEvents = 'all';
            iconGroup.setAttribute('transform', `translate(${iconX}, ${iconY})`);
            
            // Ícone de impressora
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', 0);
            rect.setAttribute('y', 0);
            rect.setAttribute('width', iconSize);
            rect.setAttribute('height', iconSize * 0.8);
            rect.setAttribute('rx', '4');
            rect.setAttribute('fill', '#10b981');
            rect.setAttribute('stroke', '#059669');
            rect.setAttribute('stroke-width', '2');
            
            const top = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            top.setAttribute('x', 0);
            top.setAttribute('y', 0);
            top.setAttribute('width', iconSize);
            top.setAttribute('height', iconSize * 0.3);
            top.setAttribute('rx', '4');
            top.setAttribute('fill', '#34d399');
            
            const paper = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            paper.setAttribute('x', iconSize * 0.25);
            paper.setAttribute('y', iconSize * 0.35);
            paper.setAttribute('width', iconSize * 0.5);
            paper.setAttribute('height', iconSize * 0.45);
            paper.setAttribute('fill', '#ffffff');
            paper.setAttribute('stroke', '#d1d5db');
            paper.setAttribute('stroke-width', '1');
            
            iconGroup.appendChild(rect);
            iconGroup.appendChild(top);
            iconGroup.appendChild(paper);
            overlay.appendChild(iconGroup);
            
            // Drag and drop
            let iconPos = { x: iconX, y: iconY };
            let dragStartPos = null;
            
            iconGroup.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                dragStartPos = { x: e.clientX, y: e.clientY };
                const svgPoint = overlay.createSVGPoint();
                svgPoint.x = e.clientX;
                svgPoint.y = e.clientY;
                const ctm = overlay.getScreenCTM();
                if (ctm) {
                    const svgCoords = svgPoint.matrixTransform(ctm.inverse());
                    window.globalDragState.isDragging = true;
                    window.globalDragState.iconGroup = iconGroup;
                    window.globalDragState.dragStart = { x: svgCoords.x - iconPos.x, y: svgCoords.y - iconPos.y };
                    window.globalDragState.iconPos = { x: iconPos.x, y: iconPos.y };
                    window.globalDragState.area = area;
                    window.globalDragState.equipment = printer;
                    window.globalDragState.equipment.type = 'printer';
                    window.globalDragState.iconSize = iconSize;
                }
            });
            
            iconGroup.addEventListener('mouseup', () => {
                if (window.globalDragState.isDragging && window.globalDragState.iconGroup === iconGroup) {
                    iconPos = { ...window.globalDragState.iconPos };
                }
            });
            
            iconGroup.addEventListener('click', (e) => {
                e.stopPropagation();
                if (dragStartPos) {
                    const dragDistance = Math.sqrt(
                        Math.pow(e.clientX - dragStartPos.x, 2) + 
                        Math.pow(e.clientY - dragStartPos.y, 2)
                    );
                    if (dragDistance < 5) { // Se moveu menos de 5px, é um clique
                        const rect = iconGroup.getBoundingClientRect();
                        showEquipmentDetails(printer, 'printer', area.name, rect.left + rect.width / 2, rect.top);
                    }
                }
                dragStartPos = null;
            });
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
    
    // Posicionar modal em cima do ícone
    if (iconX !== undefined && iconY !== undefined) {
        modalContent.style.position = 'absolute';
        modalContent.style.left = `${iconX}px`;
        modalContent.style.top = `${iconY - 20}px`;
        modalContent.style.transform = 'translate(-50%, -100%)';
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

window.addEquipment = addEquipment;
window.deleteArea = deleteArea;
window.resetPlant = resetPlant;
window.closeEquipmentViewModal = closeEquipmentViewModal;

function saveToStorage() {
    try {
        localStorage.setItem('clinicPlantData', JSON.stringify(state));
    } catch (e) {
        console.error('Erro ao salvar dados:', e);
    }
}

function loadFromStorage() {
    try {
        const saved = localStorage.getItem('clinicPlantData');
        if (saved) {
            const parsed = JSON.parse(saved);
            state.areas = parsed.areas || state.areas;
            state.plantImages = parsed.plantImages || state.plantImages;
            state.currentFloor = parsed.currentFloor || 1;
            document.getElementById('floor-select').value = state.currentFloor;
            const url = state.plantImages[state.currentFloor];
            if (url) displayPlant(url);
            updateAreasList();
        }
    } catch (e) {
        console.error('Erro ao carregar dados:', e);
    }
}

