import {
    canvasWrapper,
    fillColorInput,
    strokeColorInput,
    strokeWidthInput,
    cornerRadiusControl,
    cornerRadiusInput,
    textColorInput,
    fontSizeInput,
    fontFamilyInput,
    fontBoldCheckbox,
    rightPanel,
    tabButtons,
    tabPanes,
    propertiesTab,
    previewTab,
    arrowTypeControls,
    shapePropertiesDiv,
    textPropertiesDiv,
    subgraphPropertiesDiv,
    connectorPropertiesDiv,
    layeringControlsDiv,
    zoomLevelSpan,
    toolPaletteButtons,
    diagramTypeSelector,
    flowchartTools,
    sequenceTools,
    classTools,
    erTools,
    ganttTools,
    journeyTools
} from './modules/domElements.js';

// --- Mermaid Initialization ---
        mermaid.initialize({ startOnLoad: false, theme: 'base', themeVariables: {
            primaryColor: '#f3f4f6',
            primaryTextColor: '#1f2937',
            primaryBorderColor: '#6366f1',
            lineColor: '#4b5563',
            textColor: '#1f2937',
        }});

        // --- Canvas Setup ---
        const canvas = new fabric.Canvas('canvas', {
            width: canvasWrapper.clientWidth,
            height: canvasWrapper.clientHeight,
            backgroundColor: '#f9fafb',
            preserveObjectStacking: true // Important for layering
        });

import * as state from './modules/state.js';

        // --- State Management ---

        // --- Layers Management ---

        // --- Utility Functions ---
        function generateId() {
            return 'N' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
        }

        // --- Clipboard and Object Manipulation Functions ---

        function deleteObject(obj) {
            if (obj.isConnector) {
                state.setConnections(state.connections.filter(c => c !== obj.connection));
            } else {
                // Remove any connections related to this object
                state.setConnections(state.connections.filter(conn => {
                    if (conn.from === obj.id || conn.to === obj.id) {
                        canvas.remove(conn.line);
                        return false;
                    }
                    return true;
                }));

                // Remove from specific arrays based on object type
                if (obj.isActor) {
                    state.setActors(state.actors.filter(a => a.id !== obj.id));
                } else if (obj.isClass) {
                    state.setClasses(state.classes.filter(c => c.id !== obj.id));
                } else if (obj.isMessage) {
                    state.setMessages(state.messages.filter(m => m.from !== obj.id && m.to !== obj.id));
                }
            }

            canvas.remove(obj);
            canvas.discardActiveObject().renderAll();
            generateAndRenderMermaid();
        }

        function copyObject() {
            const activeObj = canvas.getActiveObject();
            if (!activeObj) return;

            // Clone the object data
            state.setClipboard({
                type: activeObj.type,
                data: activeObj.toObject(['id', 'shapeType', 'isShapeGroup', 'isText', 'isSubgraph', 'isActor', 'isClass', 'isNote', 'className', 'stereotype', 'attributes', 'methods']),
                isShapeGroup: activeObj.isShapeGroup,
                isText: activeObj.isText,
                isSubgraph: activeObj.isSubgraph,
                isActor: activeObj.isActor,
                isClass: activeObj.isClass,
                isNote: activeObj.isNote,
                shapeType: activeObj.shapeType,
                className: activeObj.className,
                stereotype: activeObj.stereotype,
                attributes: activeObj.attributes,
                methods: activeObj.methods
            });

            showNotification('Object copied to clipboard', 'info');
        }

        function pasteObject() {
            if (!state.clipboard) {
                showNotification('Nothing to paste', 'info');
                return;
            }

            // Create new object from clipboard data
            const pasteData = { ...state.clipboard.data };
            pasteData.left += 20; // Offset to avoid overlap
            pasteData.top += 20;

            let newObj;

            if (state.clipboard.isShapeGroup) {
                newObj = addShape(state.clipboard.shapeType, {
                    id: generateId(),
                    left: pasteData.left,
                    top: pasteData.top,
                    text: state.clipboard.data.objects?.[1]?.text || 'Copy'
                });

                // Apply stored properties
                const shape = newObj.getObjects()[0];
                const text = newObj.getObjects()[1];
                if (state.clipboard.data.objects?.[0]) {
                    shape.set({
                        fill: state.clipboard.data.objects[0].fill,
                        stroke: state.clipboard.data.objects[0].stroke,
                        strokeWidth: state.clipboard.data.objects[0].strokeWidth
                    });
                }
                if (state.clipboard.data.objects?.[1]) {
                    text.set({
                        fill: state.clipboard.data.objects[1].fill,
                        fontSize: state.clipboard.data.objects[1].fontSize,
                        fontFamily: state.clipboard.data.objects[1].fontFamily,
                        fontWeight: state.clipboard.data.objects[1].fontWeight
                    });
                }

            } else if (state.clipboard.isText) {
                newObj = createText({
                    text: state.clipboard.data.text || 'Copy',
                    left: pasteData.left,
                    top: pasteData.top
                });
                newObj.set({
                    fill: state.clipboard.data.fill,
                    fontSize: state.clipboard.data.fontSize,
                    fontFamily: state.clipboard.data.fontFamily,
                    fontWeight: state.clipboard.data.fontWeight
                });

            } else if (state.clipboard.isSubgraph) {
                newObj = createSubgraph({
                    title: state.clipboard.data.objects?.[1]?.text || 'Copy',
                    left: pasteData.left,
                    top: pasteData.top,
                    width: state.clipboard.data.objects?.[0]?.width || 400,
                    height: state.clipboard.data.objects?.[0]?.height || 300
                });

            } else if (state.clipboard.isActor) {
                newObj = createActor({
                    text: state.clipboard.data.objects?.[2]?.text || 'Copy',
                    left: pasteData.left,
                    top: pasteData.top
                });

            } else if (state.clipboard.isClass) {
                newObj = createClass({
                    name: state.clipboard.className || 'Copy',
                    stereotype: state.clipboard.stereotype || '',
                    attributes: state.clipboard.attributes || '+ attribute: type',
                    methods: state.clipboard.methods || '+ method(): type',
                    left: pasteData.left,
                    top: pasteData.top
                });

            } else if (state.clipboard.isNote) {
                newObj = createNote({
                    text: state.clipboard.data.objects?.[1]?.text || 'Copy',
                    left: pasteData.left,
                    top: pasteData.top
                });
            }

            if (newObj) {
                canvas.setActiveObject(newObj);
                canvas.renderAll();
                generateAndRenderMermaid();
                showNotification('Object pasted', 'success');
            }
        }

        function duplicateObject() {
            copyObject();
            pasteObject();
        }

        function selectAllObjects() {
            const allObjects = canvas.getObjects().filter(obj => !obj.isConnector);
            if (allObjects.length > 1) {
                const selection = new fabric.ActiveSelection(allObjects, {
                    canvas: canvas
                });
                canvas.setActiveObject(selection);
                canvas.renderAll();
                showNotification(`Selected ${allObjects.length} objects`, 'info');
            } else if (allObjects.length === 1) {
                canvas.setActiveObject(allObjects[0]);
                canvas.renderAll();
            }
        }

        function moveObject(obj, deltaX, deltaY) {
            obj.set({
                left: obj.left + deltaX,
                top: obj.top + deltaY
            });

            // Update connections if this is a connectable object
            if (obj.isShapeGroup || obj.isSubgraph || obj.isActor || obj.isClass) {
                updateConnectionsFor(obj);
            }

            canvas.renderAll();
        }

        function editObjectText(obj) {
            let textObject = null;

            if (obj.isShapeGroup || obj.isSubgraph || obj.isActor || obj.isClass || obj.isNote) {
                textObject = obj.getObjects().find(o => o.type === 'i-text');
            } else if (obj.isText) {
                textObject = obj;
            }

            if (textObject) {
                state.setCurrentEditingObject(textObject);
                const textInput = document.getElementById('text-input');
                const textModal = document.getElementById('text-modal');
                textInput.value = textObject.text;
                textModal.classList.remove('hidden');
                textInput.focus();
            }
        }

        function updateToolPalette(newDiagramType) {
            // Hide all tool groups
            flowchartTools.classList.add('hidden');
            sequenceTools.classList.add('hidden');
            classTools.classList.add('hidden');
            erTools.classList.add('hidden');
            ganttTools.classList.add('hidden');
            journeyTools.classList.add('hidden');

            // Show relevant tools based on diagram type
            switch(newDiagramType) {
                case 'flowchart':
                    flowchartTools.classList.remove('hidden');
                    flowchartTools.style.display = 'flex';
                    break;
                case 'sequenceDiagram':
                    sequenceTools.classList.remove('hidden');
                    sequenceTools.style.display = 'flex';
                    break;
                case 'classDiagram':
                    classTools.classList.remove('hidden');
                    classTools.style.display = 'flex';
                    break;
                case 'erDiagram':
                    erTools.classList.remove('hidden');
                    erTools.style.display = 'flex';
                    break;
                case 'gantt':
                    ganttTools.classList.remove('hidden');
                    ganttTools.style.display = 'flex';
                    break;
                case 'journey':
                    journeyTools.classList.remove('hidden');
                    journeyTools.style.display = 'flex';
                    break;
            }

            // Update the dropdown if it exists
            if (diagramTypeSelector) {
                diagramTypeSelector.value = newDiagramType;
            }

            // If current mode is not valid for new diagram type, switch to select
            const currentModeButton = document.querySelector(`[data-mode="${state.currentMode}"]`);
            if (currentModeButton && currentModeButton.closest('.tool-group.hidden')) {
                setMode('select');
            }

            console.log('Updated tool palette for:', newDiagramType);
        }

        function setMode(newMode) {
            state.setCurrentMode(newMode);

            toolPaletteButtons.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.mode === newMode);
            });

            if (state.currentMode === 'select') {
                canvas.selection = true;
                canvas.forEachObject(obj => obj.set('selectable', true));
                canvas.defaultCursor = 'grab';
                canvas.hoverCursor = 'move';
            } else {
                canvas.selection = false;
                canvas.forEachObject(obj => obj.set('selectable', false));
                canvas.defaultCursor = 'crosshair';
                canvas.hoverCursor = 'crosshair';
            }
        }

        const resizeCanvas = () => {
            const canvasContainer = document.querySelector('#canvas-wrapper .absolute');
            const availableWidth = canvasWrapper.clientWidth - 30; // Account for ruler
            const availableHeight = canvasWrapper.clientHeight - 30; // Account for ruler

            canvas.setDimensions({
                width: availableWidth,
                height: availableHeight
            });

            resizeRulers();
            canvas.renderAll();
        };

        function updateZoomDisplay(zoom) {
            zoomLevelSpan.textContent = `${Math.round(zoom * 100)}%`;
        }

        // --- NEW: Sketchy rendering function ---
        function makeSketchy(obj, roughness = 0.5) {
            if (!obj.path) return obj; // Not a path-based object

            const path = obj.path;
            for (let i = 0; i < path.length; i++) {
                const point = path[i];
                for (let j = 1; j < point.length; j++) {
                    point[j] += (Math.random() - 0.5) * roughness;
                }
            }
            return obj;
        }

        // --- Object Creation ---
        function addShape(type, options = {}) {
            const id = options.id || generateId();
            const FONT_FAMILY = 'Kalam';

            const commonProps = {
                originX: 'center', originY: 'center', fill: '#ffffff', stroke: '#222222',
                strokeWidth: 2, shadow: 'rgba(0,0,0,0.05) 2px 2px 4px', cornerColor: '#6366f1',
                cornerSize: 8, transparentCorners: false,
            };
            const textObj = new fabric.IText(options.text || 'Edit Me', {
                fontFamily: FONT_FAMILY, fontSize: 18, fill: '#222222', originX: 'center', originY: 'center',
            });

            let shape;
            switch (type) {
                case 'rect': shape = new fabric.Rect({ ...commonProps, width: 160, height: 65, rx: 0, ry: 0 }); break;
                case 'rounded': shape = new fabric.Rect({ ...commonProps, width: 160, height: 65, rx: 15, ry: 15 }); break;
                case 'circle': shape = new fabric.Circle({ ...commonProps, radius: 50 }); break;
                case 'diamond': shape = new fabric.Path('M 0 -60 L 80 0 L 0 60 L -80 0 Z', { ...commonProps }); break;
                case 'actor': shape = new fabric.Rect({ ...commonProps, width: 120, height: 40, rx: 5, ry: 5, fill: '#e3f2fd' }); break;
            }

            // Apply sketchy effect to all shapes
            makeSketchy(shape, 1.5);

            const group = new fabric.Group([shape, textObj], {
                left: options.left || 100, top: options.top || 100, id: id, shapeType: type,
                isShapeGroup: true
            });
            canvas.add(group);
            return group;
        }

        function createEntity(options = {}) {
            const id = options.id || generateId();
            const entityName = options.name || 'Entity';

            // Main entity rectangle
            const entityRect = new fabric.Rect({
                width: 200, height: 120, fill: '#fff3e0', stroke: '#f57c00',
                strokeWidth: 2, rx: 5, ry: 5,
                originX: 'center', originY: 'center'
            });

            // Entity name text
            const nameText = new fabric.IText(entityName, {
                fontSize: 18, fontFamily: 'Kalam', fill: '#e65100', fontWeight: 'bold',
                originX: 'center', originY: 'center', top: -30
            });

            // Attributes text
            const attributesText = new fabric.IText(options.attributes || 'id PK\nname\nemail', {
                fontSize: 12, fontFamily: 'Kalam', fill: '#bf360c',
                originX: 'center', originY: 'center', top: 10, width: 180,
                textAlign: 'left'
            });

            const group = new fabric.Group([entityRect, nameText, attributesText], {
                left: options.left || 200, top: options.top || 200,
                isEntity: true, id: id, hasControls: true,
                entityName: entityName,
                attributes: options.attributes || 'id PK\nname\nemail'
            });

            canvas.add(group);
            entities.push({ id: id, name: entityName, object: group });
            return group;
        }

        function createTask(options = {}) {
            const id = options.id || generateId();
            const taskName = options.name || 'Task';

            // Task rectangle with timeline styling
            const taskRect = new fabric.Rect({
                width: 200, height: 40, fill: '#e3f2fd', stroke: '#1976d2',
                strokeWidth: 2, rx: 3, ry: 3,
                originX: 'center', originY: 'center'
            });

            // Task name text
            const nameText = new fabric.IText(taskName, {
                fontSize: 14, fontFamily: 'Kalam', fill: '#0d47a1', fontWeight: 'bold',
                originX: 'center', originY: 'center', top: -10
            });

            // Duration text
            const durationText = new fabric.IText(options.duration || '3d', {
                fontSize: 10, fontFamily: 'Kalam', fill: '#1565c0',
                originX: 'center', originY: 'center', top: 8
            });

            const group = new fabric.Group([taskRect, nameText, durationText], {
                left: options.left || 200, top: options.top || 200,
                isTask: true, id: id, hasControls: true,
                taskName: taskName,
                duration: options.duration || '3d',
                startDate: options.startDate || new Date().toISOString().split('T')[0],
                dependencies: options.dependencies || []
            });

            canvas.add(group);
            tasks.push({
                id: id,
                name: taskName,
                object: group,
                duration: options.duration || '3d',
                startDate: options.startDate || new Date().toISOString().split('T')[0],
                dependencies: options.dependencies || []
            });
            return group;
        }

        function createMilestone(options = {}) {
            const id = options.id || generateId();
            const milestoneName = options.name || 'Milestone';

            // Diamond shape for milestone
            const milestoneShape = new fabric.Path('M 0 -25 L 25 0 L 0 25 L -25 0 Z', {
                fill: '#f3e5f5', stroke: '#7b1fa2', strokeWidth: 2,
                originX: 'center', originY: 'center'
            });

            // Milestone name text
            const nameText = new fabric.IText(milestoneName, {
                fontSize: 12, fontFamily: 'Kalam', fill: '#4a148c', fontWeight: 'bold',
                originX: 'center', originY: 'center', top: 35
            });

            const group = new fabric.Group([milestoneShape, nameText], {
                left: options.left || 200, top: options.top || 200,
                isMilestone: true, id: id, hasControls: true,
                milestoneName: milestoneName,
                date: options.date || new Date().toISOString().split('T')[0]
            });

            canvas.add(group);
            milestones.push({
                id: id,
                name: milestoneName,
                object: group,
                date: options.date || new Date().toISOString().split('T')[0]
            });
            return group;
        }

        function createJourneyStep(options = {}) {
            const id = options.id || generateId();
            const stepName = options.name || 'Step';

            // Step circle
            const stepCircle = new fabric.Circle({
                radius: 30, fill: '#e8f5e8', stroke: '#2e7d32',
                strokeWidth: 3, originX: 'center', originY: 'center'
            });

            // Step number/icon
            const stepNumber = new fabric.IText(options.number || '1', {
                fontSize: 16, fontFamily: 'Kalam', fill: '#1b5e20', fontWeight: 'bold',
                originX: 'center', originY: 'center'
            });

            // Step name text
            const nameText = new fabric.IText(stepName, {
                fontSize: 12, fontFamily: 'Kalam', fill: '#2e7d32', fontWeight: 'bold',
                originX: 'center', originY: 'center', top: 50
            });

            // Score text
            const scoreText = new fabric.IText(`Score: ${options.score || '5'}`, {
                fontSize: 10, fontFamily: 'Kalam', fill: '#388e3c',
                originX: 'center', originY: 'center', top: 70
            });

            const group = new fabric.Group([stepCircle, stepNumber, nameText, scoreText], {
                left: options.left || 200, top: options.top || 200,
                isJourneyStep: true, id: id, hasControls: true,
                stepName: stepName,
                stepNumber: options.number || '1',
                score: options.score || '5',
                actors: options.actors || ['User']
            });

            canvas.add(group);
            journeySteps.push({
                id: id,
                name: stepName,
                object: group,
                number: options.number || '1',
                score: options.score || '5',
                actors: options.actors || ['User']
            });
            return group;
        }

        function createJourneySection(options = {}) {
            const id = options.id || generateId();
            const sectionName = options.name || 'Section';

            // Section header rectangle
            const sectionRect = new fabric.Rect({
                width: 300, height: 50, fill: '#f3e5f5', stroke: '#7b1fa2',
                strokeWidth: 2, rx: 5, ry: 5,
                originX: 'center', originY: 'center'
            });

            // Section name text
            const nameText = new fabric.IText(sectionName, {
                fontSize: 16, fontFamily: 'Kalam', fill: '#4a148c', fontWeight: 'bold',
                originX: 'center', originY: 'center'
            });

            const group = new fabric.Group([sectionRect, nameText], {
                left: options.left || 200, top: options.top || 100,
                isJourneySection: true, id: id, hasControls: true,
                sectionName: sectionName
            });

            canvas.add(group);
            journeySections.push({
                id: id,
                name: sectionName,
                object: group
            });
            return group;
        }

        function createClass(options = {}) {
            const id = options.id || generateId();
            const className = options.name || 'Class';

            // Main class rectangle
            const classRect = new fabric.Rect({
                width: 200, height: 150, fill: '#f8f9fa', stroke: '#6c757d',
                strokeWidth: 2, rx: 3, ry: 3,
                originX: 'center', originY: 'center'
            });

            // Class name section
            const nameRect = new fabric.Rect({
                width: 200, height: 40, fill: '#e9ecef', stroke: '#6c757d',
                strokeWidth: 1, rx: 3, ry: 3,
                originX: 'center', originY: 'top', top: -75
            });

            // Class name text
            const nameText = new fabric.IText(className, {
                fontSize: 16, fontFamily: 'Kalam', fill: '#212529', fontWeight: 'bold',
                originX: 'center', originY: 'center', top: -55
            });

            // Stereotype text (if any)
            const stereotypeText = new fabric.IText(options.stereotype || '', {
                fontSize: 12, fontFamily: 'Kalam', fill: '#6c757d',
                originX: 'center', originY: 'center', top: -70,
                visible: !!(options.stereotype)
            });

            // Attributes section separator
            const attrSeparator = new fabric.Line([-100, -35, 100, -35], {
                stroke: '#6c757d', strokeWidth: 1
            });

            // Attributes text
            const attributesText = new fabric.IText(options.attributes || '+ attribute: type', {
                fontSize: 12, fontFamily: 'Kalam', fill: '#495057',
                originX: 'center', originY: 'top', top: -25, width: 180,
                textAlign: 'left'
            });

            // Methods section separator
            const methodSeparator = new fabric.Line([-100, 15, 100, 15], {
                stroke: '#6c757d', strokeWidth: 1
            });

            // Methods text
            const methodsText = new fabric.IText(options.methods || '+ method(): type', {
                fontSize: 12, fontFamily: 'Kalam', fill: '#495057',
                originX: 'center', originY: 'top', top: 25, width: 180,
                textAlign: 'left'
            });

            const group = new fabric.Group([
                classRect, nameRect, nameText, stereotypeText,
                attrSeparator, attributesText, methodSeparator, methodsText
            ], {
                left: options.left || 200, top: options.top || 200,
                isClass: true, id: id, hasControls: true,
                className: className,
                stereotype: options.stereotype || '',
                attributes: options.attributes || '+ attribute: type',
                methods: options.methods || '+ method(): type'
            });

            canvas.add(group);
            classes.push({ id: id, name: className, object: group });
            return group;
        }

        function createRelationship(fromClass, toClass, options = {}) {
            if (!fromClass || !toClass) return;

            const fromPoint = fromClass.getCenterPoint();
            const toPoint = toClass.getCenterPoint();

            let line, arrowHead, arrowTail;
            const relType = options.type || '-->';

            // Create different line styles based on relationship type
            if (relType.includes('..')) {
                // Dependency - dashed line
                line = new fabric.Line([fromPoint.x, fromPoint.y, toPoint.x, toPoint.y], {
                    stroke: '#6c757d', strokeWidth: 2, strokeDashArray: [5, 5]
                });
            } else {
                // Association, inheritance, etc. - solid line
                line = new fabric.Line([fromPoint.x, fromPoint.y, toPoint.x, toPoint.y], {
                    stroke: '#6c757d', strokeWidth: 2
                });
            }

            const angle = fabric.util.radiansToDegrees(Math.atan2(toPoint.y - fromPoint.y, toPoint.x - fromPoint.x));

            const parts = [line];

            // Create appropriate arrow heads based on relationship type
            if (relType.includes('|>')) {
                // Inheritance - hollow triangle
                arrowHead = new fabric.Triangle({
                    width: 16, height: 16, fill: 'white', stroke: '#6c757d', strokeWidth: 2,
                    left: toPoint.x, top: toPoint.y,
                    originX: 'center', originY: 'center',
                    angle: angle + 90
                });
                parts.push(arrowHead);
            } else if (relType.includes('>')) {
                // Association - solid triangle
                arrowHead = new fabric.Triangle({
                    width: 12, height: 12, fill: '#6c757d',
                    left: toPoint.x, top: toPoint.y,
                    originX: 'center', originY: 'center',
                    angle: angle + 90
                });
                parts.push(arrowHead);
            }

            if (relType.includes('*')) {
                // Composition - filled diamond
                const diamond = new fabric.Path('M 0 -8 L 8 0 L 0 8 L -8 0 Z', {
                    fill: '#6c757d', left: fromPoint.x, top: fromPoint.y,
                    originX: 'center', originY: 'center', angle: angle
                });
                parts.push(diamond);
            } else if (relType.includes('o')) {
                // Aggregation - hollow diamond
                const diamond = new fabric.Path('M 0 -8 L 8 0 L 0 8 L -8 0 Z', {
                    fill: 'white', stroke: '#6c757d', strokeWidth: 2,
                    left: fromPoint.x, top: fromPoint.y,
                    originX: 'center', originY: 'center', angle: angle
                });
                parts.push(diamond);
            }

            // Add relationship label if provided
            if (options.label) {
                const label = new fabric.IText(options.label, {
                    left: (fromPoint.x + toPoint.x) / 2, top: (fromPoint.y + toPoint.y) / 2 - 20,
                    fontSize: 12, fontFamily: 'Kalam', fill: '#6c757d',
                    originX: 'center', originY: 'center',
                    backgroundColor: 'rgba(255,255,255,0.8)'
                });
                parts.push(label);
            }

            const group = new fabric.Group(parts, {
                isRelationship: true,
                id: options.id || generateId(),
                relationshipData: {
                    from: fromClass.id,
                    to: toClass.id,
                    type: relType,
                    label: options.label || ''
                }
            });

            canvas.add(group);
            relationships.push(group.relationshipData);
            return group;
        }

        function createText(options = {}) {
            const id = options.id || generateId();
            const text = new fabric.IText(options.text || 'Text', {
                left: options.left || 100, top: options.top || 100,
                fontFamily: 'Kalam', fontSize: 18, fill: '#222222',
                isText: true, id: id
            });
            canvas.add(text);
            return text;
        }

        function createActor(options = {}) {
            const id = options.id || generateId();
            const rect = new fabric.Rect({
                width: 120, height: 40, fill: '#e3f2fd', stroke: '#1976d2',
                strokeWidth: 2, rx: 5, ry: 5,
                originX: 'center', originY: 'top'
            });

            const text = new fabric.IText(options.text || 'Actor', {
                fontSize: 16, fontFamily: 'Kalam', fill: '#1976d2', fontWeight: 'bold',
                originX: 'center', originY: 'center'
            });

            const lifeline = new fabric.Line([0, 20, 0, 400], {
                stroke: '#1976d2', strokeWidth: 2, strokeDashArray: [5, 5],
                originX: 'center', originY: 'top'
            });

            const group = new fabric.Group([lifeline, rect, text], {
                left: options.left || 100, top: options.top || 50,
                isActor: true, id: id, hasControls: true
            });

            canvas.add(group);
            actors.push({ id: id, name: options.text || 'Actor', object: group });
            return group;
        }

        function createNote(options = {}) {
            const id = options.id || generateId();
            const rect = new fabric.Rect({
                width: 200, height: 80, fill: '#fff3e0', stroke: '#f57c00',
                strokeWidth: 2, rx: 3, ry: 3,
                originX: 'center', originY: 'center'
            });

            const text = new fabric.IText(options.text || 'Note', {
                fontSize: 14, fontFamily: 'Kalam', fill: '#e65100',
                originX: 'center', originY: 'center', width: 180,
                textAlign: 'center'
            });

            const group = new fabric.Group([rect, text], {
                left: options.left || 100, top: options.top || 100,
                isNote: true, id: id, hasControls: true
            });

            canvas.add(group);
            return group;
        }

        function createMessage(fromActor, toActor, options = {}) {
            if (!fromActor || !toActor) return;

            const fromPoint = fromActor.getCenterPoint();
            const toPoint = toActor.getCenterPoint();
            const yPos = options.yPos || Math.max(fromPoint.y, toPoint.y) + 100;

            const line = new fabric.Line([fromPoint.x, yPos, toPoint.x, yPos], {
                stroke: '#333', strokeWidth: 2
            });

            // Arrow head
            const arrowHead = new fabric.Triangle({
                width: 12, height: 12, fill: '#333',
                left: toPoint.x, top: yPos,
                originX: 'center', originY: 'center',
                angle: fromPoint.x < toPoint.x ? 90 : -90
            });

            const text = new fabric.IText(options.text || 'Message', {
                left: (fromPoint.x + toPoint.x) / 2, top: yPos - 20,
                fontSize: 14, fontFamily: 'Kalam', fill: '#333',
                originX: 'center', originY: 'center',
                backgroundColor: 'rgba(255,255,255,0.8)'
            });

            const group = new fabric.Group([line, arrowHead, text], {
                isMessage: true,
                id: options.id || generateId(),
                messageData: {
                    from: fromActor.id,
                    to: toActor.id,
                    text: options.text || 'Message',
                    type: options.type || '->>' // ->>, -->>, ->, --
                }
            });

            canvas.add(group);
            messages.push(group.messageData);
            return group;
        }

        function createSubgraph(options = {}) {
            const id = options.id || generateId();
            const rect = new fabric.Rect({
                width: options.width || 400, height: options.height || 300,
                fill: 'rgba(200, 200, 200, 0.1)',
                stroke: '#aaaaaa', strokeWidth: 2, rx: 0, ry: 0,
                strokeDashArray: [8, 4],
                originX: 'left', originY: 'top'
            });

            makeSketchy(rect, 2);

            const title = new fabric.IText(options.title || 'Subgraph', {
                fontSize: 20, fontFamily: 'Kalam', fontWeight: 'bold', fill: '#333333',
                originX: 'left', originY: 'top', left: 10, top: 10
            });
            const group = new fabric.Group([rect, title], {
                left: options.left || 150, top: options.top || 150,
                isSubgraph: true, id: id, hasControls: true,
                subgraphWidth: rect.width, subgraphHeight: rect.height // Store original dims
            });
            canvas.add(group);
            group.sendToBack();
            return group;
        }

        function createMarkdownBox(options = {}) {
            const id = options.id || generateId();
            const foreignObject = new fabric.Rect({
                width: 300,
                height: 200,
                fill: 'white',
                stroke: '#ccc',
                strokeWidth: 1
            });

            const text = new fabric.IText('## Markdown\n\n- Write something\n- **Bold** or *italic*', {
                left: 10,
                top: 10,
                fontSize: 14,
                width: 280,
                height: 180,
                editingBorderColor: 'blue',
            });

            const group = new fabric.Group([foreignObject, text], {
                left: options.left || 200,
                top: options.top || 200,
                isMarkdown: true,
                id: id
            });

            canvas.add(group);
            return group;
        }

        // --- Inspector Logic ---
        function updatePropertiesPanel(obj) {
            [shapePropertiesDiv, textPropertiesDiv, connectorPropertiesDiv, subgraphPropertiesDiv].forEach(div => div && div.classList.add('hidden'));

            if (!obj) return;

            if (obj.isShapeGroup) {
                const shape = obj.getObjects()[0];
                const text = obj.getObjects()[1];
                shapePropertiesDiv.classList.remove('hidden');
                textPropertiesDiv.classList.remove('hidden');

                // Populate object name and text fields
                document.getElementById('object-name').value = obj.id || '';
                document.getElementById('object-text').value = text.get('text') || '';

                fillColorInput.value = shape.get('fill');
                strokeColorInput.value = shape.get('stroke');
                strokeWidthInput.value = shape.get('strokeWidth');
                cornerRadiusControl.classList.toggle('hidden', obj.shapeType !== 'rect');
                if (obj.shapeType === 'rect') cornerRadiusInput.value = shape.get('rx');

                textColorInput.value = text.get('fill');
                fontSizeInput.value = text.get('fontSize');
                fontFamilyInput.value = text.get('fontFamily');
                fontBoldCheckbox.checked = text.get('fontWeight') === 'bold';

            } else if (obj.isText) {
                textPropertiesDiv.classList.remove('hidden');
                document.getElementById('text-object-info').classList.remove('hidden');
                document.getElementById('text-content-info').classList.remove('hidden');

                // Populate standalone text object fields
                document.getElementById('text-object-name').value = obj.id || '';
                document.getElementById('text-content').value = obj.get('text') || '';

                textColorInput.value = obj.get('fill');
                fontSizeInput.value = obj.get('fontSize');
                fontFamilyInput.value = obj.get('fontFamily');
                fontBoldCheckbox.checked = obj.get('fontWeight') === 'bold';
            } else if (obj.isConnector) {
                connectorPropertiesDiv.classList.remove('hidden');
                updateConnectorInspector(obj.connection);
            } else if (obj.isSubgraph) {
                subgraphPropertiesDiv.classList.remove('hidden');
                const objects = obj.getObjects();
                const rect = objects.find(o => o.type === 'rect');
                const title = objects.find(o => o.type === 'i-text');

                // Populate subgraph fields
                document.getElementById('subgraph-object-name').value = obj.id || '';
                if (title) document.getElementById('subgraph-title').value = title.text;
                if (rect) {
                    document.getElementById('subgraph-fill-color').value = rect.get('fill');
                    document.getElementById('subgraph-stroke-color').value = rect.get('stroke');
                }
            }
        }

        function updateConnectorInspector(conn) {
            if (!conn) return;
            document.getElementById('connector-text').value = conn.text || '';
            arrowTypeControls.forEach(radio => {
                radio.checked = radio.value === conn.type;
            });
        }

        // --- Connector Drawing Logic ---
        function redrawConnector(conn) {
            if (conn.line) canvas.remove(conn.line);

            const fromShape = canvas.getObjects().find(o => o.id === conn.from);
            const toShape = canvas.getObjects().find(o => o.id === conn.to);
            if (!fromShape || !toShape) return;

            const fromPoint = fromShape.getCenterPoint();
            const toPoint = toShape.getCenterPoint();

            const line = new fabric.Line([fromPoint.x, fromPoint.y, toPoint.x, toPoint.y], {
                stroke: '#222222', strokeWidth: 2,
            });
            makeSketchy(line, 1);

            const angle = fabric.util.radiansToDegrees(Math.atan2(toPoint.y - fromPoint.y, toPoint.x - fromPoint.x));

            const parts = [line];
            if (conn.type.includes('>')) {
                const arrowHead = new fabric.Triangle({ width: 15, height: 15, fill: '#222222', angle: angle + 90, left: toPoint.x, top: toPoint.y, originX: 'center', originY: 'center' });
                parts.push(arrowHead);
            }
            if (conn.type.includes('<')) {
                const arrowTail = new fabric.Triangle({ width: 15, height: 15, fill: '#222222', angle: angle - 90, left: fromPoint.x, top: fromPoint.y, originX: 'center', originY: 'center' });
                parts.push(arrowTail);
            }

            if (conn.text) {
                const text = new fabric.IText(conn.text, {
                    left: (fromPoint.x + toPoint.x) / 2,
                    top: (fromPoint.y + toPoint.y) / 2,
                    originX: 'center', originY: 'center',
                    fontSize: 16, fill: '#222222', fontFamily: 'Kalam',
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    padding: 2
                });
                parts.push(text);
            }

            const group = new fabric.Group(parts, {
                selectable: true, evented: true, hasControls: false, hasBorders: false,
                lockMovementX: true, lockMovementY: true, originX: 'center', originY: 'center',
                isConnector: true,
                connection: conn, // Link back to the data
            });

            conn.line = group;
            canvas.add(group);
            group.sendToBack();
        }

        function updateConnectionsFor(shape) {
            connections.forEach(conn => {
                if (conn.from === shape.id || conn.to === shape.id) {
                    redrawConnector(conn);
                }
            });
        }

        // --- Context Menu Functions ---
        function showContextMenu(event, obj) {
            event.preventDefault();

            // Remove existing context menu
            const existingMenu = document.querySelector('.context-menu');
            if (existingMenu) {
                existingMenu.remove();
            }

            const menu = document.createElement('div');
            menu.className = 'context-menu';
            menu.style.left = `${event.clientX}px`;
            menu.style.top = `${event.clientY}px`;

            const menuItems = [];

            if (obj) {
                // Object-specific actions
                menuItems.push(
                    { icon: '✏️', text: 'Edit Text', action: () => editObjectText(obj) },
                    { icon: '📄', text: 'Copy', action: () => { canvas.setActiveObject(obj); copyObject(); } },
                    { icon: '📋', text: 'Duplicate', action: () => { canvas.setActiveObject(obj); duplicateObject(); } },
                    { divider: true },
                    { icon: '⬆️', text: 'Bring to Front', action: () => { obj.bringToFront(); canvas.renderAll(); } },
                    { icon: '⬇️', text: 'Send to Back', action: () => { obj.sendToBack(); canvas.renderAll(); } },
                    { divider: true },
                    { icon: '🗑️', text: 'Delete', action: () => deleteObject(obj), danger: true }
                );
            } else {
                // Canvas actions
                menuItems.push(
                    { icon: '📋', text: 'Paste', action: () => pasteObject(), disabled: !clipboard },
                    { icon: '🔄', text: 'Select All', action: () => selectAllObjects() },
                    { divider: true },
                    { icon: '🔍', text: 'Zoom In', action: () => document.getElementById('zoom-in-btn').click() },
                    { icon: '🔍', text: 'Zoom Out', action: () => document.getElementById('zoom-out-btn').click() },
                    { icon: '🏠', text: 'Reset Zoom', action: () => document.getElementById('zoom-reset-btn').click() }
                );
            }

            menuItems.forEach((item, index) => {
                if (item.divider) {
                    const divider = document.createElement('div');
                    divider.className = 'border-t border-gray-200 my-1';
                    menu.appendChild(divider);
                } else {
                    const menuItem = document.createElement('div');
                    menuItem.className = `context-menu-item ${item.disabled ? 'disabled' : ''} ${item.danger ? 'text-red-600' : ''}`;
                    menuItem.innerHTML = `<span>${item.icon}</span><span>${item.text}</span>`;

                    if (!item.disabled) {
                        menuItem.addEventListener('click', () => {
                            item.action();
                            hideContextMenu();
                        });
                    }

                    menu.appendChild(menuItem);
                }
            });

            document.body.appendChild(menu);

            // Position menu to stay within viewport
            const rect = menu.getBoundingClientRect();
            if (rect.right > window.innerWidth) {
                menu.style.left = `${event.clientX - rect.width}px`;
            }
            if (rect.bottom > window.innerHeight) {
                menu.style.top = `${event.clientY - rect.height}px`;
            }
        }

        function hideContextMenu() {
            const menu = document.querySelector('.context-menu');
            if (menu) {
                menu.remove();
            }
        }

        // --- Mobile Panel Toggle ---
        function setupMobilePanelToggle() {
            const mobileToggle = document.getElementById('mobile-panel-toggle');
            const rightPanel = document.getElementById('right-panel');

            if (mobileToggle) {
                mobileToggle.addEventListener('click', () => {
                    rightPanel.classList.toggle('mobile-open');

                    if (rightPanel.classList.contains('mobile-open')) {
                        mobileToggle.innerHTML = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`;
                    } else {
                        mobileToggle.innerHTML = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>`;
                    }
                    if (rightPanel.classList.contains('mobile-open')) {
                        mobileToggle.innerHTML = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`;
                    } else {
                        mobileToggle.innerHTML = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>`;
                    }
                });

                // Close panel when clicking outside on mobile
                document.addEventListener('click', (e) => {
                    if (window.innerWidth <= 768 && rightPanel.classList.contains('mobile-open')) {
                        if (!rightPanel.contains(e.target) && !mobileToggle.contains(e.target)) {
                            rightPanel.classList.remove('mobile-open');
                            const icon = mobileToggle.querySelector('svg path');
                            icon.setAttribute('d', 'M4 6h16M4 12h16M4 18h16');
                        }
                    }
                });
            }
        }

        // --- Enhanced Notification System ---
        function showNotification(message, type = 'info', duration = 3000) {
            // Create notification element with enhanced styling
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;

            // Add icon based on type
            const icons = {
                success: '✅',
                error: '❌',
                warning: '⚠️',
                info: 'ℹ️'
            };

            notification.innerHTML = `
                <div class="flex items-center gap-2">
                    <span class="text-lg">${icons[type] || icons.info}</span>
                    <span>${message}</span>
                </div>
            `;

            document.body.appendChild(notification);

            // Auto-remove after specified duration
            setTimeout(() => {
                notification.classList.add('fade-out');
                setTimeout(() => {
                    if (notification.parentElement) {
                        notification.remove();
                    }
                }, 300);
            }, duration);
        }

        // --- Event Listeners Setup ---
        function setupEventListeners() {
            toolPaletteButtons.forEach(btn => {
                btn.addEventListener('click', () => setMode(btn.dataset.mode));
            });


            document.getElementById('bring-to-front').addEventListener('click', () => {
                const activeObj = canvas.getActiveObject();
                if (activeObj) {
                    activeObj.bringToFront();
                    connections.forEach(conn => conn.line.sendToBack());
                    canvas.renderAll();
                }
            });

            document.getElementById('send-to-back').addEventListener('click', () => {
                const activeObj = canvas.getActiveObject();
                if (activeObj) {
                    activeObj.sendToBack();
                    if (activeObj.isConnector && activeObj.connection) {
                         redrawConnector(activeObj.connection);
                    }
                    canvas.renderAll();
                }
            });

            tabButtons.forEach(button => {
                button.addEventListener('click', () => {
                    if (button.disabled) return;
                    tabButtons.forEach(btn => btn.classList.remove('active'));
                    button.classList.add('active');
                    tabPanes.forEach(pane => pane.classList.toggle('active', pane.id === button.dataset.target));
                    tabPanes.forEach(pane => pane.classList.toggle('hidden', pane.id !== button.dataset.target));
                });
            });

            arrowTypeControls.forEach(radio => {
                radio.addEventListener('change', (e) => {
                    const activeObj = canvas.getActiveObject();
                    if (activeObj && activeObj.isConnector) {
                        const conn = activeObj.connection;
                        conn.type = e.target.value;
                        redrawConnector(conn);
                        canvas.setActiveObject(conn.line); // Reselect the new group
                        canvas.renderAll();
                    }
                });
            });

            const allInputs = document.querySelectorAll('#properties-pane input, #properties-pane select');
            allInputs.forEach(input => input.addEventListener('input', (e) => {
                const activeObj = canvas.getActiveObject();
                if (!activeObj) return;

                const textObj = activeObj.isShapeGroup ? activeObj.getObjects().find(o => o.type === 'i-text') : (activeObj.isText ? activeObj : null);
                const shapeObj = activeObj.isShapeGroup ? activeObj.getObjects()[0] : (activeObj.isShape ? activeObj : null);
                const subgraphObjects = activeObj.isSubgraph ? activeObj.getObjects() : [];
                const subgraphRect = subgraphObjects.find(o => o.type === 'rect');
                const subgraphTitle = subgraphObjects.find(o => o.type === 'i-text');

                switch (e.target.id) {
                    case 'object-name':
                        if(activeObj.isShapeGroup) {
                            // Update object ID and regenerate connections
                            const oldId = activeObj.id;
                            activeObj.set('id', e.target.value);
                            // Update any connections that reference this object
                            connections.forEach(conn => {
                                if (conn.from === oldId) conn.from = e.target.value;
                                if (conn.to === oldId) conn.to = e.target.value;
                            });
                            // Redraw affected connections
                            connections.forEach(conn => {
                                if (conn.from === e.target.value || conn.to === e.target.value) {
                                    redrawConnector(conn);
                                }
                            });
                        }
                        break;
                    case 'text-object-name':
                        if(activeObj.isText) {
                            activeObj.set('id', e.target.value);
                        }
                        break;
                    case 'subgraph-object-name':
                        if(activeObj.isSubgraph) {
                            const oldId = activeObj.id;
                            activeObj.set('id', e.target.value);
                            // Update any shapes that are contained in this subgraph
                            canvas.getObjects().forEach(obj => {
                                if (obj.subgraphId === oldId) {
                                    obj.subgraphId = e.target.value;
                                }
                            });
                        }
                        break;
                    case 'object-text': if(textObj) textObj.set('text', e.target.value); break;
                    case 'text-content': if(activeObj.isText) activeObj.set('text', e.target.value); break;
                    case 'fill-color': if(shapeObj) shapeObj.set('fill', e.target.value); break;
                    case 'stroke-color': if(shapeObj) shapeObj.set('stroke', e.target.value); break;
                    case 'stroke-width': if(shapeObj) shapeObj.set('strokeWidth', parseInt(e.target.value, 10)); break;
                    case 'corner-radius': if(shapeObj) shapeObj.set({ rx: parseInt(e.target.value, 10), ry: parseInt(e.target.value, 10) }); break;
                    case 'text-color': if(textObj) textObj.set('fill', e.target.value); break;
                    case 'font-size': if(textObj) textObj.set('fontSize', parseInt(e.target.value, 10)); break;
                    case 'font-family': if(textObj) textObj.set('fontFamily', e.target.value); break;
                    case 'font-bold': if(textObj) textObj.set('fontWeight', e.target.checked ? 'bold' : 'normal'); break;
                    case 'subgraph-title': if(subgraphTitle) subgraphTitle.set('text', e.target.value); break;
                    case 'subgraph-fill-color': if(subgraphRect) subgraphRect.set('fill', e.target.value); break;
                    case 'subgraph-stroke-color': if(subgraphRect) subgraphRect.set('stroke', e.target.value); break;
                    case 'connector-text':
                         if (activeObj.isConnector) {
                            activeObj.connection.text = e.target.value;
                            redrawConnector(activeObj.connection);
                            canvas.setActiveObject(activeObj.connection.line);
                        }
                        break;
                }

                // For grouped objects, we need to ensure the group stays selected and gets updated properly
                if (activeObj.isShapeGroup || activeObj.isSubgraph || activeObj.isClass) {
                    // Force the group to update its internal coordinates and bounds
                    activeObj.dirty = true;
                    activeObj.set('dirty', true);

                    // Make sure the object remains selected after the change
                    canvas.setActiveObject(activeObj);
                }

                canvas.renderAll();
            }));

            // Zoom Controls
            document.getElementById('zoom-in-btn').addEventListener('click', () => {
                let zoom = canvas.getZoom();
                zoom *= 1.1;
                canvas.setZoom(zoom > 20 ? 20 : zoom);
                updateZoomDisplay(canvas.getZoom());
            });
            document.getElementById('zoom-out-btn').addEventListener('click', () => {
                let zoom = canvas.getZoom();
                zoom /= 1.1;
                canvas.setZoom(zoom < 0.1 ? 0.1 : zoom);
                updateZoomDisplay(canvas.getZoom());
            });
            document.getElementById('zoom-reset-btn').addEventListener('click', () => {
                canvas.setZoom(1);
                updateZoomDisplay(canvas.getZoom());
            });

            // Add context menu support
            canvas.on('mouse:down', function(options) {
                const evt = options.e;

                // Handle right-click for context menu
                if (evt.button === 2) { // Right mouse button
                    evt.preventDefault();
                    showContextMenu(evt, options.target);
                    return;
                }

                // Hide context menu on any other click
                hideContextMenu();

                if (options.target == null && state.currentMode === 'select') {
                    state.setPanning(true);
                    state.setLastPosX(evt.clientX);
                    state.setLastPosY(evt.clientY);
                    canvas.setCursor('grabbing');
                } else if (state.currentMode === 'connector' && options.target && (options.target.isShapeGroup || options.target.isSubgraph || options.target.isActor || options.target.isClass || options.target.isEntity || options.target.isTask || options.target.isMilestone || options.target.isJourneyStep)) {
                    state.setLineStartShape(options.target);
                    const startPoint = state.lineStartShape.getCenterPoint();
                    state.setActiveLine(new fabric.Line([startPoint.x, startPoint.y, startPoint.x, startPoint.y], {
                        stroke: '#9ca3af', strokeWidth: 2, strokeDashArray: [5, 5], selectable: false, evented: false
                    }));
                    canvas.add(state.activeLine);
                }
            });

            canvas.on({
                'mouse:move': (options) => {
                    if (state.isPanning) {
                        const e = options.e;
                        const vpt = canvas.viewportTransform;
                        vpt[4] += e.clientX - state.lastPosX;
                        vpt[5] += e.clientY - state.lastPosY;
                        canvas.requestRenderAll();
                        state.setLastPosX(e.clientX);
                        state.setLastPosY(e.clientY);
                    } else if (state.currentMode === 'connector' && state.activeLine) {
                        const pointer = canvas.getPointer(options.e);
                        state.activeLine.set({ x2: pointer.x, y2: pointer.y });
                        canvas.renderAll();
                    }
                },
                'mouse:up': (options) => {
                    if (state.isPanning) {
                        state.setPanning(false);
                        canvas.setCursor('grab');
                    } else if (state.currentMode.startsWith('add-') && options.target == null) {
                        const type = state.currentMode.split('-')[1];
                        const pointer = canvas.getPointer(options.e);

                        if (type === 'text') {
                            createText({ left: pointer.x, top: pointer.y });
                        } else if (type === 'subgraph') {
                            createSubgraph({ left: pointer.x, top: pointer.y });
                        } else if (type === 'actor') {
                            createActor({ left: pointer.x, top: pointer.y });
                        } else if (type === 'note') {
                            createNote({ left: pointer.x, top: pointer.y });
                        } else if (type === 'class') {
                            createClass({ left: pointer.x, top: pointer.y });
                        } else if (type === 'entity') {
                            createEntity({ left: pointer.x, top: pointer.y });
                        } else if (type === 'attribute') {
                            createNote({ text: 'Attribute', left: pointer.x, top: pointer.y }); // Use note for attributes
                        } else if (type === 'task') {
                            createTask({ left: pointer.x, top: pointer.y });
                        } else if (type === 'milestone') {
                            createMilestone({ left: pointer.x, top: pointer.y });
                        } else if (type === 'step') {
                            createJourneyStep({ left: pointer.x, top: pointer.y });
                        } else if (type === 'section') {
                            createJourneySection({ left: pointer.x, top: pointer.y });
                        } else {
                            addShape(type, { left: pointer.x, top: pointer.y });
                        }
                        setMode('select');

                    } else if (state.currentMode === 'add-markdown' && options.target == null) {
                        const pointer = canvas.getPointer(options.e);
                        createMarkdownBox({ left: pointer.x, top: pointer.y });
                        setMode('select');
                    } else if (state.currentMode === 'connector' && state.lineStartShape) {
                        if (state.activeLine) canvas.remove(state.activeLine);
                        state.setActiveLine(null);
                        const lineEndShape = options.target;
                        if (lineEndShape && (lineEndShape.isShapeGroup || lineEndShape.isSubgraph || lineEndShape.isActor || lineEndShape.isClass || lineEndShape.isEntity || lineEndShape.isTask || lineEndShape.isMilestone || lineEndShape.isJourneyStep) && lineEndShape !== state.lineStartShape) {
                            if (state.lineStartShape.isActor && lineEndShape.isActor) {
                                // Create sequence diagram message
                                createMessage(state.lineStartShape, lineEndShape, { text: 'Message' });
                            } else if (state.lineStartShape.isClass && lineEndShape.isClass) {
                                // Create class diagram relationship
                                createRelationship(state.lineStartShape, lineEndShape, { type: '<|--', label: '' });
                            } else if (state.lineStartShape.isEntity && lineEndShape.isEntity) {
                                // Create ER diagram relationship
                                const newConn = { from: state.lineStartShape.id, to: lineEndShape.id, type: '||--o{', text: 'relationship', line: null };
                                state.setConnections([...state.connections, newConn]);
                                redrawConnector(newConn);
                            } else if (state.lineStartShape.isTask && lineEndShape.isTask) {
                                // Create Gantt dependency
                                const newConn = { from: state.lineStartShape.id, to: lineEndShape.id, type: '-->', text: '', line: null };
                                state.setConnections([...state.connections, newConn]);
                                redrawConnector(newConn);
                            } else if (state.lineStartShape.isJourneyStep && lineEndShape.isJourneyStep) {
                                // Create journey flow
                                const newConn = { from: state.lineStartShape.id, to: lineEndShape.id, type: '-->', text: '', line: null };
                                state.setConnections([...state.connections, newConn]);
                                redrawConnector(newConn);
                            } else {
                                // Create flowchart connection
                                const newConn = { from: state.lineStartShape.id, to: lineEndShape.id, type: '-->', text: '', line: null };
                                state.setConnections([...state.connections, newConn]);
                                redrawConnector(newConn);
                            }
                        }
                        state.setLineStartShape(null);
                    }
                },
                'object:moving': (e) => { if(e.target.isShapeGroup || e.target.isSubgraph || e.target.isEntity || e.target.isTask || e.target.isMilestone || e.target.isJourneyStep) updateConnectionsFor(e.target) },
                'selection:created': (e) => handleSelection(e.selected[0]),
                'selection:updated': (e) => handleSelection(e.selected[0]),
                'selection:cleared': () => handleSelection(null),
                'mouse:dblclick': (options) => {
                    const target = options.target;
                    if (target) {
                        let textObject = null;
                        if (target.isShapeGroup || target.isSubgraph) {
                            textObject = target.getObjects().find(o => o.type === 'i-text');
                        } else if (target.isText) {
                            textObject = target;
                        }

                        if (textObject) {
                            state.setCurrentEditingObject(textObject);
                            textInput.value = textObject.text;
                            textModal.classList.remove('hidden');
                            textInput.focus();
                        }
                    }
                },
                'mouse:wheel': function(opt) {
                    const delta = opt.e.deltaY;
                    let zoom = canvas.getZoom();
                    zoom *= 0.999 ** delta;
                    if (zoom > 20) zoom = 20;
                    if (zoom < 0.1) zoom = 0.1;
                    canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
                    updateZoomDisplay(zoom);
                    opt.e.preventDefault();
                    opt.e.stopPropagation();
                }
            });

            window.addEventListener('keydown', (e) => {
                // Check if user is typing in an input field or textarea
                const activeElement = document.activeElement;
                const isTyping = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'SELECT');

                // Check if any modal is open
                const textModal = document.getElementById('text-modal');
                const isModalOpen = !textModal.classList.contains('hidden') ||
                                   !document.getElementById('save-project-modal').classList.contains('hidden') ||
                                   !document.getElementById('load-project-modal').classList.contains('hidden') ||
                                   !document.getElementById('saved-projects-modal').classList.contains('hidden') ||
                                   !document.getElementById('load-modal').classList.contains('hidden');

                // If typing in input or modal is open, only handle specific keys
                if (isTyping || isModalOpen) {
                    if (e.key === 'Escape') {
                        if (state.currentMode === 'connector') {
                            setMode('select');
                        }
                        // Close any open modals
                        document.querySelectorAll('.modal-overlay').forEach(modal => {
                            modal.classList.add('hidden');
                        });
                        // Blur active element
                        if (activeElement) activeElement.blur();
                    }
                    return;
                }

                const activeObj = canvas.getActiveObject();

                // Handle keyboard shortcuts
                switch (e.key.toLowerCase()) {
                    case 'delete':
                    case 'backspace':
                        if (activeObj) {
                            deleteObject(activeObj);
                        }
                        break;

                    case 'escape':
                        if (state.currentMode === 'connector') {
                            setMode('select');
                        }
                        canvas.discardActiveObject();
                        canvas.renderAll();
                        break;

                    case 's':
                        if (e.ctrlKey || e.metaKey) {
                            e.preventDefault();
                            document.getElementById('save-project-btn').click();
                        } else if (!e.ctrlKey && !e.metaKey) {
                            setMode('select');
                        }
                        break;

                    case 'o':
                        if (e.ctrlKey || e.metaKey) {
                            e.preventDefault();
                            document.getElementById('load-project-btn').click();
                        }
                        break;

                    case 'c':
                        if (e.ctrlKey || e.metaKey) {
                            e.preventDefault();
                            copyObject();
                        } else {
                            setMode('connector');
                        }
                        break;

                    case 'v':
                        if (e.ctrlKey || e.metaKey) {
                            e.preventDefault();
                            pasteObject();
                        }
                        break;

                    case 'd':
                        if (e.ctrlKey || e.metaKey) {
                            e.preventDefault();
                            duplicateObject();
                        }
                        break;

                    case 'a':
                        if (e.ctrlKey || e.metaKey) {
                            e.preventDefault();
                            selectAllObjects();
                        }
                        break;

                    case 'r':
                        if (!e.ctrlKey && !e.metaKey) {
                            setMode('add-rect');
                        }
                        break;

                    case 'e':
                        if (!e.ctrlKey && !e.metaKey) {
                            setMode('add-rounded');
                        }
                        break;

                    case 'l':
                        if (!e.ctrlKey && !e.metaKey) {
                            setMode('add-circle');
                        }
                        break;

                    case 'm':
                        if (!e.ctrlKey && !e.metaKey) {
                            setMode('add-diamond');
                        }
                        break;

                    case 't':
                        if (!e.ctrlKey && !e.metaKey) {
                            setMode('add-text');
                        }
                        break;

                    case 'g':
                        if (!e.ctrlKey && !e.metaKey) {
                            setMode('add-subgraph');
                        }
                        break;

                    case '+':
                    case '=':
                        if (e.ctrlKey || e.metaKey) {
                            e.preventDefault();
                            document.getElementById('zoom-in-btn').click();
                        }
                        break;

                    case '-':
                        if (e.ctrlKey || e.metaKey) {
                            e.preventDefault();
                            document.getElementById('zoom-out-btn').click();
                        }
                        break;

                    case '0':
                        if (e.ctrlKey || e.metaKey) {
                            e.preventDefault();
                            document.getElementById('zoom-reset-btn').click();
                        }
                        break;

                    case 'arrowup':
                        if (activeObj) {
                            e.preventDefault();
                            moveObject(activeObj, 0, e.shiftKey ? -10 : -1);
                        }
                        break;

                    case 'arrowdown':
                        if (activeObj) {
                            e.preventDefault();
                            moveObject(activeObj, 0, e.shiftKey ? 10 : 1);
                        }
                        break;

                    case 'arrowleft':
                        if (activeObj) {
                            e.preventDefault();
                            moveObject(activeObj, e.shiftKey ? -10 : -1, 0);
                        }
                        break;

                    case 'arrowright':
                        if (activeObj) {
                            e.preventDefault();
                            moveObject(activeObj, e.shiftKey ? 10 : 1, 0);
                        }
                        break;

                    case 'enter':
                        if (activeObj) {
                            editObjectText(activeObj);
                        }
                        break;

                    case 'f2':
                        if (activeObj) {
                            editObjectText(activeObj);
                        }
                        break;
                }
            });
            window.addEventListener('resize', resizeCanvas);

            // Export functionality
            document.getElementById('export-png-btn').addEventListener('click', exportToPNG);
            document.getElementById('export-svg-btn').addEventListener('click', exportToSVG);
            document.getElementById('export-pdf-btn').addEventListener('click', exportToPDF);

            // Load Modal Listeners
            const loadModal = document.getElementById('load-modal');
            document.getElementById('load-chart-btn').addEventListener('click', () => loadModal.classList.remove('hidden'));
            document.getElementById('cancel-load').addEventListener('click', () => loadModal.classList.add('hidden'));
            document.getElementById('confirm-load').addEventListener('click', () => {
                const code = document.getElementById('mermaid-input').value;
                loadFromMermaidCode(code);
                loadModal.classList.add('hidden');
            });

            // Save/Load Project Modal Listeners
            const saveProjectModal = document.getElementById('save-project-modal');
            const loadProjectModal = document.getElementById('load-project-modal');
            const savedProjectsModal = document.getElementById('saved-projects-modal');

            // Save Project Modal
            document.getElementById('save-project-btn').addEventListener('click', () => {
                saveProjectModal.classList.remove('hidden');
            });

            document.getElementById('cancel-save-project').addEventListener('click', () => {
                saveProjectModal.classList.add('hidden');
            });

            document.getElementById('save-to-storage').addEventListener('click', () => {
                const projectName = document.getElementById('project-name').value.trim();
                if (saveProjectToStorage(projectName)) {
                    saveProjectModal.classList.add('hidden');
                    document.getElementById('project-name').value = '';
                }
            });

            document.getElementById('save-to-file').addEventListener('click', () => {
                const projectName = document.getElementById('project-name').value.trim();
                if (saveProjectToFile(projectName)) {
                    saveProjectModal.classList.add('hidden');
                    document.getElementById('project-name').value = '';
                }
            });

            // Load Project Modal
            document.getElementById('load-project-btn').addEventListener('click', () => {
                loadProjectModal.classList.remove('hidden');
            });

            document.getElementById('cancel-load-project').addEventListener('click', () => {
                loadProjectModal.classList.add('hidden');
            });

            document.getElementById('load-from-storage').addEventListener('click', () => {
                loadProjectModal.classList.add('hidden');
                loadProjectFromStorage();
            });

            document.getElementById('load-from-file').addEventListener('click', () => {
                loadProjectModal.classList.add('hidden');
                loadProjectFromFile();
            });

            // Saved Projects Modal
            document.getElementById('cancel-saved-projects').addEventListener('click', () => {
                savedProjectsModal.classList.add('hidden');
            });

            // Diagram Type Selector
            diagramTypeSelector.addEventListener('change', (e) => {
                const newDiagramType = e.target.value;

                // If switching diagram types, ask for confirmation if there are objects on canvas
                const hasObjects = canvas.getObjects().length > 0;
                if (hasObjects && diagramType !== newDiagramType) {
                    const confirmed = confirm(
                        `Switching to ${newDiagramType} will clear the current diagram. Continue?`
                    );

                    if (!confirmed) {
                        // Reset the dropdown to the current diagram type
                        diagramTypeSelector.value = diagramType;
                        return;
                    }

                    // Clear the canvas
                    canvas.clear();
                    connections = [];
                    actors = [];
                    messages = [];
                    classes = [];
                    relationships = [];
                }

                // Update the diagram type and tool palette
                diagramType = newDiagramType;
                updateToolPalette(diagramType);
                generateAndRenderMermaid();
            });

            // Close modals when clicking outside
            [saveProjectModal, loadProjectModal, savedProjectsModal].forEach(modal => {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        modal.classList.add('hidden');
                    }
                });
            });

            // Grid and Alignment Controls
            document.getElementById('toggle-grid').addEventListener('click', (e) => {
                e.target.classList.toggle('active');
                const isActive = e.target.classList.contains('active');

                if (isActive) {
                    canvasWrapper.classList.add('grid-background');
                } else {
                    canvasWrapper.classList.remove('grid-background');
                }
            });

            document.getElementById('toggle-snap').addEventListener('click', (e) => {
                e.target.classList.toggle('active');
                const isActive = e.target.classList.contains('active');

                // Enable/disable snap to grid
                if (isActive) {
                    enableSnapToGrid();
                } else {
                    canvas.off('object:moving');
                }
            });

            // Alignment toolbar buttons
            document.querySelectorAll('.alignment-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const alignment = e.currentTarget.dataset.align;
                    alignSelectedObjects(alignment);
                });
            });

            // Debounced mermaid generation to avoid excessive renders
            let mermaidTimeout;
            const debouncedGenerate = () => {
                clearTimeout(mermaidTimeout);
                mermaidTimeout = setTimeout(generateAndRenderMermaid, 300);
            };

            canvas.on('object:modified', debouncedGenerate);
            canvas.on('object:added', debouncedGenerate);
            canvas.on('object:removed', debouncedGenerate);

            const markdownEditor = document.getElementById('markdown-editor');
            const markdownTextarea = document.getElementById('markdown-textarea');
            const markdownToolbar = document.getElementById('markdown-toolbar');
            let currentMarkdownObject = null;

            canvas.on('mouse:dblclick', (options) => {
                if (options.target && options.target.isMarkdown) {
                    currentMarkdownObject = options.target;
                    const textObject = currentMarkdownObject.getObjects()[1];
                    markdownTextarea.innerHTML = textObject.text;
                    markdownEditor.classList.remove('hidden');
                    positionMarkdownEditor();
                }
            });

            markdownToolbar.addEventListener('click', (e) => {
                const command = e.target.closest('button').dataset.command;
                if (command === 'toggle-view') {
                    // Toggle between raw markdown and WYSIWYG
                    const isRaw = markdownTextarea.dataset.view === 'raw';
                    if (isRaw) {
                        const html = marked.parse(markdownTextarea.innerText);
                        markdownTextarea.innerHTML = html;
                        markdownTextarea.dataset.view = 'wysiwyg';
                    } else {
                        markdownTextarea.innerText = markdownTextarea.innerHTML;
                        markdownTextarea.dataset.view = 'raw';
                    }
                } else if (command === 'createLink') {
                    const url = prompt('Enter a URL:');
                    if (url) {
                        document.execCommand(command, false, url);
                    }
                } else {
                    document.execCommand(command, false, null);
                }
            });

            markdownTextarea.addEventListener('input', () => {
                if (currentMarkdownObject) {
                    const textObject = currentMarkdownObject.getObjects()[1];
                    textObject.text = markdownTextarea.innerHTML;
                    canvas.renderAll();
                }
            });

            function positionMarkdownEditor() {
                if (!currentMarkdownObject) return;
                const- { left, top, width, height } = currentMarkdownObject.getBoundingRect();
                markdownEditor.style.left = `${left}px`;
                markdownEditor.style.top = `${top}px`;
                markdownEditor.style.width = `${width}px`;
                markdownEditor.style.height = `${height}px`;
            }

            canvas.on('object:moving', positionMarkdownEditor);
            canvas.on('object:scaling', positionMarkdownEditor);

            document.addEventListener('click', (e) => {
                if (!markdownEditor.contains(e.target) && !canvas.getActiveObject()) {
                    markdownEditor.classList.add('hidden');
                    currentMarkdownObject = null;
                }
            });
        }

        function handleSelection(target) {
            propertiesTab.disabled = true;
            [shapePropertiesDiv, textPropertiesDiv, connectorPropertiesDiv, layeringControlsDiv, subgraphPropertiesDiv].forEach(div => div && div.classList.add('hidden'));

            if (!target) {
                if (propertiesTab.classList.contains('active')) previewTab.click();
                return;
            }

            propertiesTab.disabled = false;
            propertiesTab.click();
            layeringControlsDiv.classList.remove('hidden');
            updatePropertiesPanel(target);
        }

        // --- Text Editing Modal ---
        const textModal = document.getElementById('text-modal');
        const textInput = document.getElementById('text-input');
        const saveTextBtn = document.getElementById('save-text');
        const cancelTextBtn = document.getElementById('cancel-text');

        saveTextBtn.addEventListener('click', () => {
            if (state.currentEditingObject) {
                state.currentEditingObject.set('text', textInput.value);
                canvas.renderAll();
                generateAndRenderMermaid();
            }
            hideTextModal();
        });
        cancelTextBtn.addEventListener('click', () => hideTextModal());
        function hideTextModal() {
            state.setCurrentEditingObject(null);
            textModal.classList.add('hidden');
        }
        textInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') saveTextBtn.click();
            else if (e.key === 'Escape') cancelTextBtn.click();
        });


        // --- Mermaid Generation and Parsing ---
        async function generateAndRenderMermaid() {
            try {
                // Generate based on current diagram type, don't auto-detect
                switch(diagramType) {
                    case 'classDiagram':
                        await generateClassDiagram();
                        break;
                    case 'sequenceDiagram':
                        await generateSequenceDiagram();
                        break;
                    case 'erDiagram':
                        await generateERDiagram();
                        break;
                    case 'gantt':
                        await generateGanttDiagram();
                        break;
                    case 'journey':
                        await generateJourneyDiagram();
                        break;
                    case 'flowchart':
                    default:
                        await generateFlowchart();
                        break;
                }
            } catch (error) {
                console.error('Error in generateAndRenderMermaid:', error);
                const preview = document.getElementById('mermaid-preview');
                preview.innerHTML = `<div class="text-red-500 p-4 text-sm">Generation Error:<br><pre class="text-xs mt-2 bg-gray-100 p-2 rounded">${error.message}</pre></div>`;
            }
        }

        async function generateERDiagram() {
            let mermaidString = 'erDiagram\n';

            // Get all entities
            const entityObjects = canvas.getObjects().filter(o => o.isEntity);
            const erRelationshipObjects = canvas.getObjects().filter(o => o.isERRelationship);

            // Add entity definitions
            entityObjects.forEach(entityObj => {
                const entityName = entityObj.entityName || 'Entity';
                mermaidString += `    ${entityName} {\n`;

                // Add attributes
                if (entityObj.attributes && entityObj.attributes.trim()) {
                    const attributes = entityObj.attributes.split('\n').filter(attr => attr.trim());
                    attributes.forEach(attr => {
                        const cleanAttr = attr.trim().replace(/\s+/g, ' ');
                        // Format for ER diagram (field type)
                        if (cleanAttr.includes('PK')) {
                            mermaidString += `        ${cleanAttr.replace('PK', '').trim()} PK\n`;
                        } else if (cleanAttr.includes('FK')) {
                            mermaidString += `        ${cleanAttr.replace('FK', '').trim()} FK\n`;
                        } else {
                            // Split on common separators and take first part as field name
                            const fieldName = cleanAttr.split(/[\s:]/)[0];
                            mermaidString += `        ${fieldName} string\n`;
                        }
                    });
                }

                mermaidString += `    }\n`;
            });

            // Add relationships from connections
            connections.forEach(conn => {
                const fromEntity = entityObjects.find(e => e.id === conn.from);
                const toEntity = entityObjects.find(e => e.id === conn.to);

                if (fromEntity && toEntity) {
                    const fromName = fromEntity.entityName || 'Entity';
                    const toName = toEntity.entityName || 'Entity';
                    const relationshipType = conn.type || '||--o{';
                    const relationshipName = conn.text || 'relates';

                    mermaidString += `    ${fromName} ${relationshipType} ${toName} : ${relationshipName}\n`;
                }
            });

            // If no entities, add a placeholder
            if (entityObjects.length === 0) {
                mermaidString += `    CUSTOMER {\n        string name\n        string email\n    }\n`;
                mermaidString += `    ORDER {\n        int id PK\n        int customer_id FK\n    }\n`;
                mermaidString += `    CUSTOMER ||--o{ ORDER : places\n`;
            }

            await renderMermaidString(mermaidString);
        }

        async function generateGanttDiagram() {
            let mermaidString = 'gantt\n    title Project Timeline\n    dateFormat YYYY-MM-DD\n    axisFormat %m/%d\n\n';

            // Get all tasks and milestones
            const taskObjects = canvas.getObjects().filter(o => o.isTask);
            const milestoneObjects = canvas.getObjects().filter(o => o.isMilestone);
            const sectionObjects = canvas.getObjects().filter(o => o.isJourneySection); // Reuse sections

            // Sort tasks by position (top to bottom)
            taskObjects.sort((a, b) => a.top - b.top);
            milestoneObjects.sort((a, b) => a.top - b.top);

            // Add sections if any
            if (sectionObjects.length > 0) {
                sectionObjects.forEach(section => {
                    const sectionName = section.sectionName || 'Development';
                    mermaidString += `    section ${sectionName}\n`;

                    // Find tasks in this section (rough proximity)
                    const sectionTasks = taskObjects.filter(task =>
                        Math.abs(task.top - section.top) < 100
                    );

                    sectionTasks.forEach(task => {
                        const taskName = task.taskName || 'Task';
                        const duration = task.duration || '3d';
                        const startDate = task.startDate || '2024-01-01';

                        mermaidString += `        ${taskName} :${task.id}, ${startDate}, ${duration}\n`;
                    });
                });
            } else {
                // Default section
                mermaidString += `    section Development\n`;

                taskObjects.forEach(task => {
                    const taskName = task.taskName || 'Task';
                    const duration = task.duration || '3d';
                    const startDate = task.startDate || '2024-01-01';

                    mermaidString += `        ${taskName} :${task.id}, ${startDate}, ${duration}\n`;
                });
            }

            // Add milestones
            milestoneObjects.forEach(milestone => {
                const milestoneName = milestone.milestoneName || 'Milestone';
                const date = milestone.date || '2024-01-15';

                mermaidString += `        ${milestoneName} :milestone, ${date}, 0d\n`;
            });

            // If no tasks, add placeholder
            if (taskObjects.length === 0 && milestoneObjects.length === 0) {
                mermaidString += `    section Planning\n`;
                mermaidString += `        Research :task1, 2024-01-01, 3d\n`;
                mermaidString += `        Design :task2, after task1, 5d\n`;
                mermaidString += `    section Development\n`;
                mermaidString += `        Implementation :task3, after task2, 7d\n`;
                mermaidString += `        Testing :milestone, 2024-01-16, 0d\n`;
            }

            await renderMermaidString(mermaidString);
        }

        async function generateJourneyDiagram() {
            let mermaidString = 'journey\n    title User Journey\n\n';

            // Get all journey steps and sections
            const stepObjects = canvas.getObjects().filter(o => o.isJourneyStep);
            const sectionObjects = canvas.getObjects().filter(o => o.isJourneySection);

            // Sort by position (left to right, top to bottom)
            stepObjects.sort((a, b) => a.top - b.top || a.left - b.left);
            sectionObjects.sort((a, b) => a.top - b.top);

            // Add sections with their steps
            if (sectionObjects.length > 0) {
                sectionObjects.forEach(section => {
                    const sectionName = section.sectionName || 'Experience';
                    mermaidString += `    section ${sectionName}\n`;

                    // Find steps in this section (rough proximity based on vertical position)
                    const sectionSteps = stepObjects.filter(step =>
                        step.top > section.top && step.top < section.top + 150
                    );

                    if (sectionSteps.length > 0) {
                        sectionSteps.forEach(step => {
                            const stepName = step.stepName || 'Step';
                            const score = step.score || '5';
                            const actors = step.actors || ['User'];

                            mermaidString += `        ${stepName}: ${score}: ${actors.join(', ')}\n`;
                        });
                    } else {
                        // Add placeholder step if section is empty
                        mermaidString += `        Default Step: 5: User\n`;
                    }
                });
            } else {
                // Default section with all steps
                mermaidString += `    section User Experience\n`;

                if (stepObjects.length > 0) {
                    stepObjects.forEach(step => {
                        const stepName = step.stepName || 'Step';
                        const score = step.score || '5';
                        const actors = step.actors || ['User'];

                        mermaidString += `        ${stepName}: ${score}: ${actors.join(', ')}\n`;
                    });
                } else {
                    // Add placeholder steps
                    mermaidString += `        Discover: 3: User\n`;
                    mermaidString += `        Research: 4: User\n`;
                    mermaidString += `        Purchase: 5: User, Support\n`;
                    mermaidString += `        Use Product: 4: User\n`;
                }
            }

            await renderMermaidString(mermaidString);
        }

        async function generateSequenceDiagram() {
            let mermaidString = 'sequenceDiagram\n';

            // Get all actors
            const actorObjects = canvas.getObjects().filter(o => o.isActor);
            const messageObjects = canvas.getObjects().filter(o => o.isMessage);
            const noteObjects = canvas.getObjects().filter(o => o.isNote);

            // Sort actors by x position
            actorObjects.sort((a, b) => a.left - b.left);

            // Add participant declarations
            actorObjects.forEach(actor => {
                const textObj = actor.getObjects().find(o => o.type === 'i-text');
                const actorName = textObj ? textObj.text : 'Actor';
                mermaidString += `    participant ${actorName}\n`;
            });

            // Sort messages by y position (top to bottom)
            messageObjects.sort((a, b) => a.top - b.top);

            // Add messages
            messageObjects.forEach(msgObj => {
                if (msgObj.messageData) {
                    const { from, to, text, type } = msgObj.messageData;
                    const fromActor = actorObjects.find(a => a.id === from);
                    const toActor = actorObjects.find(a => a.id === to);

                    if (fromActor && toActor) {
                        const fromName = fromActor.getObjects().find(o => o.type === 'i-text')?.text || 'Actor';
                        const toName = toActor.getObjects().find(o => o.type === 'i-text')?.text || 'Actor';
                        mermaidString += `    ${fromName}${type}${toName}: ${text}\n`;
                    }
                }
            });

            // Add notes
            noteObjects.forEach(note => {
                const textObj = note.getObjects().find(o => o.type === 'i-text');
                const noteText = textObj ? textObj.text : 'Note';
                // Find closest actor for note positioning
                let closestActor = null;
                let minDistance = Infinity;
                actorObjects.forEach(actor => {
                    const distance = Math.abs(actor.left - note.left);
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestActor = actor;
                    }
                });

                if (closestActor) {
                    const actorName = closestActor.getObjects().find(o => o.type === 'i-text')?.text || 'Actor';
                    const position = note.left > closestActor.left ? 'right' : 'left';
                    mermaidString += `    Note ${position} of ${actorName}: ${noteText}\n`;
                }
            });

            await renderMermaidString(mermaidString);
        }

        async function generateClassDiagram() {
            let mermaidString = 'classDiagram\n';

            // Get all classes
            const classObjects = canvas.getObjects().filter(o => o.isClass);
            const relationshipObjects = canvas.getObjects().filter(o => o.isRelationship);

            // Add class definitions
            classObjects.forEach(classObj => {
                const className = classObj.className || 'Class';

                // Add stereotype if present
                if (classObj.stereotype) {
                    mermaidString += `    class ${className} {\n`;
                    mermaidString += `        <<${classObj.stereotype}>>\n`;
                } else {
                    mermaidString += `    class ${className} {\n`;
                }

                // Add attributes
                if (classObj.attributes && classObj.attributes.trim()) {
                    const attributes = classObj.attributes.split('\n').filter(attr => attr.trim());
                    attributes.forEach(attr => {
                        mermaidString += `        ${attr.trim()}\n`;
                    });
                }

                // Add methods
                if (classObj.methods && classObj.methods.trim()) {
                    const methods = classObj.methods.split('\n').filter(method => method.trim());
                    methods.forEach(method => {
                        mermaidString += `        ${method.trim()}\n`;
                    });
                }

                mermaidString += `    }\n`;
            });

            // Add relationships
            relationshipObjects.forEach(relObj => {
                if (relObj.relationshipData) {
                    const { from, to, type, label } = relObj.relationshipData;
                    const fromClass = classObjects.find(c => c.id === from);
                    const toClass = classObjects.find(c => c.id === to);

                    if (fromClass && toClass) {
                        const fromName = fromClass.className || 'Class';
                        const toName = toClass.className || 'Class';

                        if (label && label.trim()) {
                            mermaidString += `    ${fromName} ${type} ${toName} : ${label}\n`;
                        } else {
                            mermaidString += `    ${fromName} ${type} ${toName}\n`;
                        }
                    }
                }
            });

            // Add standalone class definitions for classes without explicit definitions
            classObjects.forEach(classObj => {
                const className = classObj.className || 'Class';
                if (!mermaidString.includes(`class ${className} {`)) {
                    // Just add the class name without brackets
                    mermaidString += `    ${className}\n`;

                    // Add individual attribute and method lines
                    if (classObj.attributes && classObj.attributes.trim()) {
                        const attributes = classObj.attributes.split('\n').filter(attr => attr.trim());
                        attributes.forEach(attr => {
                            mermaidString += `    ${className} : ${attr.trim()}\n`;
                        });
                    }

                    if (classObj.methods && classObj.methods.trim()) {
                        const methods = classObj.methods.split('\n').filter(method => method.trim());
                        methods.forEach(method => {
                            mermaidString += `    ${className} : ${method.trim()}\n`;
                        });
                    }
                }
            });

            await renderMermaidString(mermaidString);
        }

        async function generateFlowchart() {
            const shapes = canvas.getObjects().filter(o => o.isShapeGroup);
            const subgraphs = canvas.getObjects().filter(o => o.isSubgraph);

            shapes.forEach(shape => {
                shape.subgraphId = null;
                for (const subgraph of subgraphs) {
                    // Check if shape is contained within subgraph bounds
                    const shapeBounds = shape.getBoundingRect();
                    const subgraphBounds = subgraph.getBoundingRect();

                    if (shapeBounds.left >= subgraphBounds.left &&
                        shapeBounds.top >= subgraphBounds.top &&
                        shapeBounds.left + shapeBounds.width <= subgraphBounds.left + subgraphBounds.width &&
                        shapeBounds.top + shapeBounds.height <= subgraphBounds.top + subgraphBounds.height) {
                        shape.subgraphId = subgraph.id;
                        break;
                    }
                }
            });

            let mermaidString = `flowchart ${flowchartDirection}\n`;

            const nodesOutside = shapes.filter(s => !s.subgraphId);
            nodesOutside.forEach(shape => {
                mermaidString += `    ${getNodeDefinition(shape)};\n`;
            });

            subgraphs.forEach(subgraph => {
                const titleObj = subgraph.getObjects().find(o => o.type === 'i-text');
                const title = titleObj ? titleObj.text : 'Subgraph';
                mermaidString += `    subgraph ${subgraph.id} ["${title}"]\n`;
                const nodesInside = shapes.filter(s => s.subgraphId === subgraph.id);
                nodesInside.forEach(shape => {
                    mermaidString += `        ${getNodeDefinition(shape)};\n`;
                });
                mermaidString += `    end\n`;
            });

            // Group connections by source to handle multiple targets
            const connectionsBySource = {};
            connections.forEach(conn => {
                if (!connectionsBySource[conn.from]) {
                    connectionsBySource[conn.from] = [];
                }
                connectionsBySource[conn.from].push(conn);
            });

            // Generate connection strings, grouping multiple targets from same source
            Object.keys(connectionsBySource).forEach(sourceId => {
                const conns = connectionsBySource[sourceId];
                if (conns.length === 1) {
                    const conn = conns[0];
                    if (conn.text && conn.text.trim() !== '') {
                        mermaidString += `    ${conn.from} -->|${conn.text.replace(/"/g, '#quot;')}| ${conn.to};\n`;
                    } else {
                        mermaidString += `    ${conn.from} ${conn.type} ${conn.to};\n`;
                    }
                } else {
                    // Multiple connections from same source
                    conns.forEach(conn => {
                        if (conn.text && conn.text.trim() !== '') {
                            mermaidString += `    ${conn.from} -->|${conn.text.replace(/"/g, '#quot;')}| ${conn.to};\n`;
                        } else {
                            mermaidString += `    ${conn.from} ${conn.type} ${conn.to};\n`;
                        }
                    });
                }
            });

            function getNodeDefinition(shape) {
                const textObj = shape.getObjects().find(o => o.type === 'i-text');
                const text = textObj && textObj.text ? textObj.text.replace(/"/g, '#quot;') : 'Node';

                let shapeSyntax;
                switch (shape.shapeType) {
                    case 'rect': shapeSyntax = `["${text}"]`; break;
                    case 'rounded': shapeSyntax = `("${text}")`; break;
                    case 'circle': shapeSyntax = `(("${text}"))`; break;
                    case 'diamond': shapeSyntax = `{"${text}"}`; break;
                    default: shapeSyntax = `["${text}"]`;
                }
                return `${shape.id}${shapeSyntax}`;
            }

            await renderMermaidString(mermaidString);
        }

        async function renderMermaidString(mermaidString) {
            document.getElementById('mermaid-code').textContent = mermaidString;

            const preview = document.getElementById('mermaid-preview');
            try {
                // Clear any existing content first
                preview.innerHTML = '';

                // Generate a unique ID for each render
                const graphId = 'mermaid-graph-' + Date.now();
                const { svg } = await mermaid.render(graphId, mermaidString);
                preview.innerHTML = svg;
            } catch (e) {
                console.error('Mermaid rendering error:', e);
                preview.innerHTML = `<div class="text-red-500 p-4 text-sm">Preview Error:<br><pre class="text-xs mt-2 bg-gray-100 p-2 rounded">${e.message}</pre></div>`;
            }
        }

        function parseMermaidCode(code) {
            const lines = code.split('\n').map(l => l.trim());

            // Detect diagram type
            const firstLine = lines.find(line => line && !line.startsWith('%%'));
            if (firstLine && firstLine.includes('sequenceDiagram')) {
                diagramType = 'sequenceDiagram';
                return parseSequenceDiagram(lines);
            } else if (firstLine && firstLine.includes('classDiagram')) {
                diagramType = 'classDiagram';
                return parseClassDiagram(lines);
            } else if (firstLine && firstLine.includes('erDiagram')) {
                diagramType = 'erDiagram';
                return parseERDiagram(lines);
            } else if (firstLine && firstLine.includes('gantt')) {
                diagramType = 'gantt';
                return parseGanttDiagram(lines);
            } else if (firstLine && firstLine.includes('journey')) {
                diagramType = 'journey';
                return parseJourneyDiagram(lines);
            } else {
                diagramType = 'flowchart';
                return parseFlowchart(lines);
            }
        }

        function parseSequenceDiagram(lines) {
            const participants = [];
            const messages = [];
            const notes = [];

            for (const line of lines) {
                if (!line || line.startsWith('%%')) continue;

                if (line.includes('sequenceDiagram')) continue;

                // Parse participant
                const participantMatch = line.match(/^\s*participant\s+([a-zA-Z0-9_]+)/);
                if (participantMatch) {
                    participants.push({ name: participantMatch[1] });
                    continue;
                }

                // Parse message
                const messageMatch = line.match(/^\s*([a-zA-Z0-9_]+)\s*(--?>>?|--?>)\s*([a-zA-Z0-9_]+)\s*:\s*(.*)$/);
                if (messageMatch) {
                    const from = messageMatch[1];
                    const type = messageMatch[2];
                    const to = messageMatch[3];
                    const text = messageMatch[4];

                    // Ensure participants exist
                    if (!participants.some(p => p.name === from)) {
                        participants.push({ name: from });
                    }
                    if (!participants.some(p => p.name === to)) {
                        participants.push({ name: to });
                    }

                    messages.push({ from, to, type, text });
                    continue;
                }

                // Parse note
                const noteMatch = line.match(/^\s*Note\s+(left|right|over)\s+of\s+([a-zA-Z0-9_]+)\s*:\s*(.*)$/);
                if (noteMatch) {
                    const position = noteMatch[1];
                    const actor = noteMatch[2];
                    const text = noteMatch[3];
                    notes.push({ position, actor, text });
                    continue;
                }
            }

            return { type: 'sequence', participants, messages, notes };
        }

        function parseClassDiagram(lines) {
            const classes = [];
            const relationships = [];
            let currentClass = null;

            for (const line of lines) {
                if (!line || line.startsWith('%%')) continue;

                if (line.includes('classDiagram')) continue;

                // Parse class definition start
                const classStartMatch = line.match(/^\s*class\s+([a-zA-Z0-9_]+)\s*\{/);
                if (classStartMatch) {
                    currentClass = {
                        name: classStartMatch[1],
                        stereotype: '',
                        attributes: [],
                        methods: []
                    };
                    continue;
                }

                // Parse class end
                if (line.match(/^\s*\}\s*$/)) {
                    if (currentClass) {
                        classes.push(currentClass);
                        currentClass = null;
                    }
                    continue;
                }

                // Parse stereotype inside class
                const stereotypeMatch = line.match(/^\s*<<([^>]+)>>\s*$/);
                if (stereotypeMatch && currentClass) {
                    currentClass.stereotype = stereotypeMatch[1];
                    continue;
                }

                // Parse attributes and methods inside class
                if (currentClass && line.trim()) {
                    const member = line.trim();
                    if (member.includes('()')) {
                        currentClass.methods.push(member);
                    } else if (!member.startsWith('<<')) {
                        currentClass.attributes.push(member);
                    }
                    continue;
                }

                // Parse standalone class attributes/methods
                const memberMatch = line.match(/^\s*([a-zA-Z0-9_]+)\s*:\s*(.+)$/);
                if (memberMatch) {
                    const className = memberMatch[1];
                    const member = memberMatch[2];

                    let classObj = classes.find(c => c.name === className);
                    if (!classObj) {
                        classObj = { name: className, stereotype: '', attributes: [], methods: [] };
                        classes.push(classObj);
                    }

                    if (member.includes('()')) {
                        classObj.methods.push(member);
                    } else {
                        classObj.attributes.push(member);
                    }
                    continue;
                }

                // Parse relationships
                const relMatch = line.match(/^\s*([a-zA-Z0-9_]+)\s*(<\|--|-->|--\*|--o|--|\.\.>|\.\.\|>)\s*([a-zA-Z0-9_]+)(?:\s*:\s*(.+))?$/);
                if (relMatch) {
                    const from = relMatch[1];
                    const type = relMatch[2];
                    const to = relMatch[3];
                    const label = relMatch[4] || '';

                    // Ensure classes exist
                    if (!classes.find(c => c.name === from)) {
                        classes.push({ name: from, stereotype: '', attributes: [], methods: [] });
                    }
                    if (!classes.find(c => c.name === to)) {
                        classes.push({ name: to, stereotype: '', attributes: [], methods: [] });
                    }

                    relationships.push({ from, to, type, label });
                    continue;
                }

                // Parse simple class names
                const simpleClassMatch = line.match(/^\s*([a-zA-Z0-9_]+)\s*$/);
                if (simpleClassMatch && !classes.find(c => c.name === simpleClassMatch[1])) {
                    classes.push({
                        name: simpleClassMatch[1],
                        stereotype: '',
                        attributes: [],
                        methods: []
                    });
                    continue;
                }
            }

            // Add any remaining class being parsed
            if (currentClass) {
                classes.push(currentClass);
            }

            return { type: 'class', classes, relationships };
        }

        function parseERDiagram(lines) {
            const entities = [];
            const relationships = [];
            let currentEntity = null;

            for (const line of lines) {
                if (!line || line.startsWith('%%') || line.includes('erDiagram')) continue;

                // Entity definition start
                const entityStartMatch = line.match(/^\s*([a-zA-Z0-9_]+)\s*\{/);
                if (entityStartMatch) {
                    currentEntity = { name: entityStartMatch[1], attributes: [] };
                    continue;
                }

                // Entity definition end
                if (line.match(/^\s*\}\s*$/)) {
                    if (currentEntity) {
                        entities.push(currentEntity);
                        currentEntity = null;
                    }
                    continue;
                }

                // Attributes inside entity
                if (currentEntity) {
                    const attrMatch = line.match(/^\s*([a-zA-Z0-9_]+)\s+([a-zA-Z0-9_]+)(?:\s+"(.*)")?/);
                    if (attrMatch) {
                        currentEntity.attributes.push({
                            type: attrMatch[1],
                            name: attrMatch[2],
                            comment: attrMatch[3] || ''
                        });
                    }
                    continue;
                }

                // Relationships
                const relMatch = line.match(/^\s*([a-zA-Z0-9_]+)\s*(\|o--|\|o-|o--|--|--\|\||--o\|)\s*([a-zA-Z0-9_]+)\s*:\s*(.*)$/);
                if (relMatch) {
                    relationships.push({
                        from: relMatch[1],
                        type: relMatch[2],
                        to: relMatch[3],
                        label: relMatch[4]
                    });
                }
            }
            return { type: 'er', entities, relationships };
        }

        function parseGanttDiagram(lines) {
            const tasks = [];
            const milestones = [];
            let currentSection = 'Default Section';

            for (const line of lines) {
                if (!line || line.startsWith('%%') || line.includes('gantt')) continue;

                // Section
                const sectionMatch = line.match(/^\s*section\s+(.*)/);
                if (sectionMatch) {
                    currentSection = sectionMatch[1];
                    continue;
                }

                // Task or Milestone
                const taskMatch = line.match(/^\s*(.*?)\s*:\s*(?:(milestone),\s*)?(?:(.*?),\s*)?(\d{4}-\d{2}-\d{2})?,?\s*(.*)?/);
                if (taskMatch) {
                    const name = taskMatch[1];
                    const isMilestone = taskMatch[2] === 'milestone';
                    const id = taskMatch[3];
                    const start = taskMatch[4];
                    const duration = taskMatch[5];

                    if (isMilestone) {
                        milestones.push({ name, date: start, section: currentSection });
                    } else {
                        tasks.push({ name, id, start, duration, section: currentSection });
                    }
                }
            }
            return { type: 'gantt', tasks, milestones };
        }

        function parseJourneyDiagram(lines) {
            const sections = [];
            let currentSection = null;

            for (const line of lines) {
                if (!line || line.startsWith('%%') || line.includes('journey')) continue;

                // Section
                const sectionMatch = line.match(/^\s*section\s+(.*)/);
                if (sectionMatch) {
                    if (currentSection) sections.push(currentSection);
                    currentSection = { name: sectionMatch[1], steps: [] };
                    continue;
                }

                // Step
                const stepMatch = line.match(/^\s*(.*?)\s*:\s*(\d)\s*:\s*(.*)/);
                if (stepMatch && currentSection) {
                    currentSection.steps.push({
                        name: stepMatch[1],
                        score: parseInt(stepMatch[2], 10),
                        actors: stepMatch[3].split(',').map(s => s.trim())
                    });
                }
            }
            if (currentSection) sections.push(currentSection);
            return { type: 'journey', sections };
        }

        function parseFlowchart(lines) {
            const nodes = [];
            const links = [];
            let currentSubgraphId = null;
            let direction = 'TD';
            const nodeDefinitions = new Map(); // Store node definitions with their full text

            // First pass: collect all node definitions
            for (const line of lines) {
                if (!line || line.startsWith('%%')) continue;

                // Look for node definitions with text
                const nodeDefMatch = line.match(/([a-zA-Z0-9_]+)\s*(\[[^\]]+\]|\(\(([^\)]+)\)\)|\{[^\}]+\}|\([^\)]+\))/);
                if (nodeDefMatch) {
                    const nodeId = nodeDefMatch[1];
                    const definition = nodeDefMatch[2];
                    nodeDefinitions.set(nodeId, definition);
                }
            }

            const ensureNodeExists = (nodeId, subgraphContext) => {
                if (!nodes.some(n => n.id === nodeId)) {
                    let text = nodeId; // Default to nodeId if no text found
                    let shape = 'rect';

                    // Check if we have a stored definition for this node
                    const fullDefinition = nodeDefinitions.get(nodeId);
                    if (fullDefinition) {
                        // Enhanced regex to capture text from various node formats including fa: icons
                        const nodeDefRegex = /\[([^\]]+)\]|\(\(([^\)]+)\)\)|\{([^\}]+)\}|\(([^\)]+)\)/;
                        const textMatch = fullDefinition.match(nodeDefRegex);
                        if (textMatch) {
                            // Get the captured text and clean it up
                            let capturedText = textMatch[1] || textMatch[2] || textMatch[3] || textMatch[4];
                            if (capturedText) {
                                // Remove quotes if present
                                capturedText = capturedText.replace(/^["']|["']$/g, '');
                                // Handle fa: icon syntax by keeping the readable part
                                if (capturedText.includes('fa:')) {
                                    const parts = capturedText.split(/\s+/);
                                    text = parts.slice(1).join(' ') || capturedText;
                                } else {
                                    text = capturedText;
                                }
                            }
                        }
                        // Determine shape based on brackets
                        if (fullDefinition.includes('((')) shape = 'circle';
                        else if (fullDefinition.includes('{') && !fullDefinition.includes('{{')) shape = 'diamond';
                        else if (fullDefinition.includes('(') && !fullDefinition.includes('((')) shape = 'rounded';
                    }
                    nodes.push({ id: nodeId, text, shape, subgraphId: subgraphContext });
                }
            };

            for (const line of lines) {
                if (!line) continue;

                const directionMatch = line.match(/^\s*(?:graph|flowchart)\s+(TB|BT|RL|LR|TD)\s*;?/);
                if (directionMatch) {
                    direction = directionMatch[1];
                    flowchartDirection = direction; // Update global direction
                    continue;
                }

                const subgraphStartMatch = line.match(/^\s*subgraph\s+([a-zA-Z0-9_]+)(?:\s*\["?(.*?)"?\])?\s*$/);
                if (subgraphStartMatch) {
                    currentSubgraphId = subgraphStartMatch[1];
                    nodes.push({ id: currentSubgraphId, text: subgraphStartMatch[2] || 'Subgraph', shape: 'subgraph', isSubgraph: true, subgraphId: null });
                    continue;
                }

                if (line.match(/^\s*end\s*$/)) {
                    currentSubgraphId = null;
                    continue;
                }

                // Enhanced link matching to handle multiple patterns including text on arrows
                const linkMatch = line.match(/^\s*([a-zA-Z0-9_]+)\s*(---|-->|<--|<-->)\s*(?:\|([^\|]*?)\|)?\s*([a-zA-Z0-9_]+)(?:\[.*?\]|\(.*?\)|\{.*?\})?/);
                if (linkMatch) {
                    const from = linkMatch[1];
                    const type = linkMatch[2];
                    const text = linkMatch[3] || '';
                    const toId = linkMatch[4];

                    ensureNodeExists(from, currentSubgraphId);
                    ensureNodeExists(toId, currentSubgraphId);
                    links.push({ from, to: toId, type, text });
                    continue;
                }

                // Handle multi-target connections (A --> B & C)
                const multiLinkMatch = line.match(/^\s*([a-zA-Z0-9_]+)\s*(---|-->|<--|<-->)\s*(?:\|(.*?)\|)?\s*(.+)$/);
                if (multiLinkMatch) {
                    const from = multiLinkMatch[1];
                    const type = multiLinkMatch[2];
                    const text = multiLinkMatch[3] || '';
                    const targetsStr = multiLinkMatch[4];

                    ensureNodeExists(from, currentSubgraphId);

                    // Split by & or space-separated targets
                    const targets = targetsStr.includes('&') ?
                        targetsStr.split('&').map(s => s.trim()) :
                        targetsStr.split(/\s+/).filter(s => s && /^[a-zA-Z0-9_]+/.test(s));

                    for (const target of targets) {
                        const targetIdMatch = target.match(/^\s*([a-zA-Z0-9_]+)/);
                        if (targetIdMatch) {
                            const toId = targetIdMatch[1];
                            ensureNodeExists(toId, currentSubgraphId);
                            links.push({ from, to: toId, type, text });
                        }
                    }
                    continue;
                }

                // Enhanced node definition matching that better handles various formats
                const nodeDefMatch = line.match(/^\s*([a-zA-Z0-9_]+)(?:\[([^\]]+)\]|\(\(([^\)]+)\)\)|\{([^\}]+)\}|\(([^\)]+)\))?/);
                if (nodeDefMatch) {
                    const nodeId = nodeDefMatch[1];
                    if (nodes.some(n => n.id === nodeId)) continue; // Already defined, maybe as part of a link

                    // Get the text content and clean it up
                    let text = nodeDefMatch[2] || nodeDefMatch[3] || nodeDefMatch[4] || nodeDefMatch[5] || nodeId;

                    if (text) {
                        // Remove quotes if present
                        text = text.replace(/^["']|["']$/g, '');
                        // Handle fa: icon syntax
                        if (text.includes('fa:')) {
                            const parts = text.split(/\s+/);
                            text = parts.slice(1).join(' ') || text;
                        }
                    }

                    let shape = 'rect';
                    if (nodeDefMatch[0].includes('((')) shape = 'circle';
                    else if (nodeDefMatch[0].includes('{') && !nodeDefMatch[0].includes('{{')) shape = 'diamond';
                    else if (nodeDefMatch[0].includes('(') && !nodeDefMatch[0].includes('((')) shape = 'rounded';

                    nodes.push({ id: nodeId, text, shape, subgraphId: currentSubgraphId });
                    continue;
                }
            }
            return { nodes, links, direction };
        }

        function loadFromMermaidCode(code) {
            canvas.clear();
            connections = [];
            actors = [];
            messages = [];
            classes = [];
            relationships = [];
            entities = [];
            erRelationships = [];
            tasks = [];
            milestones = [];
            journeySteps = [];
            journeySections = [];

            const parseResult = parseMermaidCode(code);

            // Update diagram type and toolbar based on loaded content
            if (parseResult.type === 'sequence') {
                loadSequenceDiagram(parseResult);
            } else if (parseResult.type === 'class') {
                loadClassDiagram(parseResult);
            } else if (parseResult.type === 'er') {
                loadERDiagram(parseResult);
            } else if (parseResult.type === 'gantt') {
                loadGanttDiagram(parseResult);
            } else if (parseResult.type === 'journey') {
                loadJourneyDiagram(parseResult);
            } else {
                loadFlowchart(parseResult);
            }

            updateToolPalette(diagramType);
        }

        function loadSequenceDiagram({ participants, messages, notes }) {
            const createdActors = {};
            const actorSpacing = 200;
            let startX = 150;

            // Create actors
            participants.forEach((participant, index) => {
                const actor = createActor({
                    text: participant.name,
                    left: startX + (index * actorSpacing),
                    top: 100
                });
                createdActors[participant.name] = actor;
            });

            // Create messages
            let messageY = 200;
            messages.forEach(message => {
                const fromActor = createdActors[message.from];
                const toActor = createdActors[message.to];

                if (fromActor && toActor) {
                    createMessage(fromActor, toActor, {
                        text: message.text,
                        type: message.type,
                        yPos: messageY
                    });
                    messageY += 80;
                }
            });

            // Create notes
            notes.forEach(note => {
                const actor = createdActors[note.actor];
                if (actor) {
                    const noteX = actor.left + (note.position === 'right' ? 100 : -100);
                    createNote({
                        text: note.text,
                        left: noteX,
                        top: messageY
                    });
                    messageY += 100;
                }
            });

            canvas.renderAll();
            generateAndRenderMermaid();
        }

        function loadERDiagram({ entities, relationships }) {
            const createdEntities = {};
            const entitySpacing = 250;
            const entitiesPerRow = 3;
            let startX = 200;
            let startY = 200;

            entities.forEach((entityData, index) => {
                const row = Math.floor(index / entitiesPerRow);
                const col = index % entitiesPerRow;

                const entityObj = createEntity({
                    name: entityData.name,
                    attributes: entityData.attributes.map(a => `${a.type} ${a.name}`).join('\n'),
                    left: startX + (col * entitySpacing),
                    top: startY + (row * 200)
                });
                createdEntities[entityData.name] = entityObj;
            });

            relationships.forEach(rel => {
                const fromEntity = createdEntities[rel.from];
                const toEntity = createdEntities[rel.to];
                if (fromEntity && toEntity) {
                    const newConn = { from: fromEntity.id, to: toEntity.id, type: rel.type, text: rel.label, line: null };
                    connections.push(newConn);
                    redrawConnector(newConn);
                }
            });
            canvas.renderAll();
            generateAndRenderMermaid();
        }

        function loadGanttDiagram({ tasks, milestones }) {
            let yPos = 100;
            tasks.forEach(task => {
                createTask({ name: task.name, left: 200, top: yPos, duration: task.duration });
                yPos += 60;
            });
            milestones.forEach(milestone => {
                createMilestone({ name: milestone.name, left: 200, top: yPos, date: milestone.date });
                yPos += 60;
            });
            canvas.renderAll();
            generateAndRenderMermaid();
        }

        function loadJourneyDiagram({ sections }) {
            let yPos = 100;
            let xPos = 150;
            sections.forEach(section => {
                createJourneySection({ name: section.name, left: xPos, top: yPos });
                yPos += 80;
                section.steps.forEach(step => {
                    createJourneyStep({ name: step.name, score: step.score, actors: step.actors, left: xPos, top: yPos });
                    yPos += 120;
                });
                xPos += 350;
                yPos = 100;
            });
            canvas.renderAll();
            generateAndRenderMermaid();
        }

        function loadClassDiagram({ classes, relationships }) {
            const createdClasses = {};
            const classSpacing = 250;
            const classesPerRow = 3;
            let startX = 200;
            let startY = 200;

            // Create classes
            classes.forEach((classData, index) => {
                const row = Math.floor(index / classesPerRow);
                const col = index % classesPerRow;

                const classObj = createClass({
                    name: classData.name,
                    stereotype: classData.stereotype,
                    attributes: classData.attributes.join('\n'),
                    methods: classData.methods.join('\n'),
                    left: startX + (col * classSpacing),
                    top: startY + (row * 200)
                });

                createdClasses[classData.name] = classObj;
            });

            // Create relationships
            relationships.forEach(relationship => {
                const fromClass = createdClasses[relationship.from];
                const toClass = createdClasses[relationship.to];

                if (fromClass && toClass) {
                    createRelationship(fromClass, toClass, {
                        type: relationship.type,
                        label: relationship.label
                    });
                }
            });

            canvas.renderAll();
            generateAndRenderMermaid();
        }

        function loadFlowchart({ nodes, links, direction }) {
            const createdObjects = {};

            const g = new dagre.graphlib.Graph({ compound: true });
            g.setGraph({ rankdir: direction, nodesep: 70, ranksep: 70, marginx: 50, marginy: 50 });
            g.setDefaultEdgeLabel(() => ({}));

            // Add all nodes and subgraphs to Dagre first
            nodes.forEach(node => {
                if (node.isSubgraph) {
                    g.setNode(node.id, { label: node.text, width: 400, height: 300, isSubgraph: true });
                } else {
                    g.setNode(node.id, { label: node.text, width: 160, height: 65 });
                }
            });

            // Now, set the parent-child relationships for subgraphs
            nodes.forEach(node => {
                if (node.subgraphId) {
                    g.setParent(node.id, node.subgraphId);
                }
            });

            // Add edges
            links.forEach(link => g.setEdge(link.from, link.to));

            dagre.layout(g);

            // Render objects on canvas using Dagre's calculated positions
            g.nodes().forEach(nodeId => {
                const nodeData = g.node(nodeId);
                if (!nodeData) return; // Skip if node is somehow invalid

                const originalNode = nodes.find(n => n.id === nodeId);
                if (!originalNode) return;

                const options = {
                    id: originalNode.id,
                    text: originalNode.text,
                    left: nodeData.x,
                    top: nodeData.y,
                };

                let fabricObj;
                if (nodeData.isSubgraph) {
                    options.title = originalNode.text;
                    options.width = nodeData.width;
                    options.height = nodeData.height;
                    fabricObj = createSubgraph(options);
                } else {
                    fabricObj = addShape(originalNode.shape, options);
                }
                createdObjects[nodeId] = fabricObj;
            });

            // Create all connections
            links.forEach(link => {
                if (createdObjects[link.from] && createdObjects[link.to]) {
                    const newConn = { from: link.from, to: link.to, type: link.type, text: link.text, line: null };
                    connections.push(newConn);
                    redrawConnector(newConn);
                }
            });

            const graphWidth = g.graph().width;
            const graphHeight = g.graph().height;
            const canvasWidth = canvas.getWidth();
            const canvasHeight = canvas.getHeight();

            canvas.setZoom(1);
            const panX = (canvasWidth - graphWidth) / 2;
            const panY = 50; // Add some top margin
            canvas.viewportTransform = [1, 0, 0, 1, panX, panY];

            canvas.renderAll();
            generateAndRenderMermaid();
        }

        // --- Draggable Panels ---
        function makeDraggable(elmnt) {
            let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
            elmnt.onmousedown = dragMouseDown;

            function dragMouseDown(e) {
                e = e || window.event;
                if (e.target.closest('button')) return;
                e.preventDefault();

                if (!elmnt.dataset.isDraggingSetup) {
                    const rect = elmnt.getBoundingClientRect();
                    const parentRect = elmnt.parentElement.getBoundingClientRect();
                    elmnt.style.left = `${rect.left - parentRect.left}px`;
                    elmnt.style.top = `${rect.top - parentRect.top}px`;
                    elmnt.style.bottom = 'auto';
                    elmnt.style.right = 'auto';
                    elmnt.style.transform = 'none';
                    elmnt.dataset.isDraggingSetup = 'true';
                }

                pos3 = e.clientX;
                pos4 = e.clientY;
                document.onmouseup = closeDragElement;
                document.onmousemove = elementDrag;
            }

            function elementDrag(e) {
                e = e || window.event;
                e.preventDefault();
                pos1 = pos3 - e.clientX;
                pos2 = pos4 - e.clientY;
                pos3 = e.clientX;
                pos4 = e.clientY;
                elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
                elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
            }

            function closeDragElement() {
                document.onmouseup = null;
                document.onmousemove = null;
            }
        }

        // --- Save/Load Project Functions ---
        function getProjectData() {
            return {
                version: '1.0',
                timestamp: new Date().toISOString(),
                diagramType: diagramType,
                flowchartDirection: flowchartDirection,
                canvas: {
                    objects: canvas.toJSON(['id', 'shapeType', 'isShapeGroup', 'isText', 'isSubgraph', 'isActor', 'isClass', 'isNote', 'isMessage', 'isRelationship', 'isConnector', 'className', 'stereotype', 'attributes', 'methods', 'messageData', 'relationshipData', 'connection', 'subgraphWidth', 'subgraphHeight', 'isMarkdown']),
                    zoom: canvas.getZoom(),
                    viewportTransform: canvas.viewportTransform
                },
                connections: connections,
                actors: actors.map(a => ({ id: a.id, name: a.name })),
                messages: messages,
                classes: classes.map(c => ({ id: c.id, name: c.name })),
                relationships: relationships
            };
        }

        function saveProjectToStorage(projectName) {
            try {
                const projectData = getProjectData();
                const savedProjects = JSON.parse(localStorage.getItem('mermaidEditProjects') || '{}');

                const projectKey = projectName || `Project_${Date.now()}`;
                savedProjects[projectKey] = {
                    name: projectKey,
                    data: projectData,
                    savedAt: new Date().toISOString()
                };

                localStorage.setItem('mermaidEditProjects', JSON.stringify(savedProjects));

                // Show success message
                showNotification(`Project "${projectKey}" saved successfully!`, 'success');
                return true;
            } catch (error) {
                console.error('Failed to save project:', error);
                showNotification('Failed to save project: ' + error.message, 'error');
                return false;
            }
        }

        function saveProjectToFile(projectName) {
            try {
                const projectData = getProjectData();
                const filename = (projectName || 'mermaid-project') + '.json';

                const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);

                const link = document.createElement('a');
                link.download = filename;
                link.href = url;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                URL.revokeObjectURL(url);
                showNotification(`Project exported as "${filename}"`, 'success');
                return true;
            } catch (error) {
                console.error('Failed to export project:', error);
                showNotification('Failed to export project: ' + error.message, 'error');
                return false;
            }
        }

        function loadProjectData(projectData) {
            try {
                // Clear current canvas
                canvas.clear();
                connections = [];
                actors = [];
                messages = [];
                classes = [];
                relationships = [];
                entities = [];
                erRelationships = [];
                tasks = [];
                milestones = [];
                journeySteps = [];
                journeySections = [];

                // Restore global state
                diagramType = projectData.diagramType || 'flowchart';
                flowchartDirection = projectData.flowchartDirection || 'TD';

                // Update tool palette
                updateToolPalette(diagramType);

                // Restore canvas objects
                canvas.loadFromJSON(projectData.canvas.objects, () => {
                    // Restore canvas view
                    if (projectData.canvas.zoom) {
                        canvas.setZoom(projectData.canvas.zoom);
                        updateZoomDisplay(projectData.canvas.zoom);
                    }
                    if (projectData.canvas.viewportTransform) {
                        canvas.viewportTransform = projectData.canvas.viewportTransform;
                    }

                    // Restore connections
                    if (projectData.connections) {
                        connections = projectData.connections;
                        connections.forEach(conn => {
                            conn.line = null; // Reset line reference
                            redrawConnector(conn);
                        });
                    }

                    // Restore other data
                    if (projectData.actors) {
                        actors = projectData.actors.map(a => ({
                            ...a,
                            object: canvas.getObjects().find(o => o.id === a.id)
                        })).filter(a => a.object);
                    }

                    if (projectData.messages) {
                        messages = projectData.messages;
                    }

                    if (projectData.classes) {
                        classes = projectData.classes.map(c => ({
                            ...c,
                            object: canvas.getObjects().find(o => o.id === c.id)
                        })).filter(c => c.object);
                    }

                    if (projectData.relationships) {
                        relationships = projectData.relationships;
                    }

                    if (projectData.layersData) {
                        loadLayersData(projectData.layersData);
                    }

                    canvas.renderAll();
                    generateAndRenderMermaid();
                    showNotification('Project loaded successfully!', 'success');
                });

                return true;
            } catch (error) {
                console.error('Failed to load project:', error);
                showNotification('Failed to load project: ' + error.message, 'error');
                return false;
            }
        }

        function loadProjectFromStorage() {
            try {
                const savedProjects = JSON.parse(localStorage.getItem('mermaidEditProjects') || '{}');
                const projectKeys = Object.keys(savedProjects);

                if (projectKeys.length === 0) {
                    showNotification('No saved projects found.', 'info');
                    return;
                }

                // Show saved projects modal
                showSavedProjectsModal(savedProjects);
            } catch (error) {
                console.error('Failed to load projects:', error);
                showNotification('Failed to load saved projects: ' + error.message, 'error');
            }
        }

        function loadProjectFromFile() {
            const fileInput = document.getElementById('file-input');
            fileInput.onchange = (event) => {
                const file = event.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const projectData = JSON.parse(e.target.result);
                        if (projectData.version && projectData.canvas) {
                            loadProjectData(projectData);
                        } else {
                            showNotification('Invalid project file format.', 'error');
                        }
                    } catch (error) {
                        console.error('Failed to parse project file:', error);
                        showNotification('Failed to parse project file: ' + error.message, 'error');
                    }
                    // Reset file input
                    fileInput.value = '';
                };
                reader.readAsText(file);
            };
            fileInput.click();
        }

        function showSavedProjectsModal(savedProjects) {
            const modal = document.getElementById('saved-projects-modal');
            const listContainer = document.getElementById('saved-projects-list');

            // Clear existing content
            listContainer.innerHTML = '';

            Object.keys(savedProjects).forEach(projectKey => {
                const project = savedProjects[projectKey];
                const savedDate = new Date(project.savedAt).toLocaleString();

                const projectItem = document.createElement('div');
                projectItem.className = 'flex items-center justify-between p-3 border border-gray-200 rounded-md hover:bg-gray-50';
                projectItem.innerHTML = `
                    <div class="flex-1">
                        <div class="font-medium text-gray-900">${project.name}</div>
                        <div class="text-sm text-gray-500">Saved: ${savedDate}</div>
                        <div class="text-xs text-gray-400">${project.data.diagramType || 'flowchart'}</div>
                    </div>
                    <div class="flex gap-2">
                        <button class="load-project-btn px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm" data-project="${projectKey}">
                            Load
                        </button>
                        <button class="delete-project-btn px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm" data-project="${projectKey}">
                            Delete
                        </button>
                    </div>
                `;

                listContainer.appendChild(projectItem);
            });

            // Add event listeners
            listContainer.querySelectorAll('.load-project-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const projectKey = e.target.dataset.project;
                    const project = savedProjects[projectKey];
                    if (project) {
                        loadProjectData(project.data);
                        modal.classList.add('hidden');
                    }
                });
            });

            listContainer.querySelectorAll('.delete-project-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    if (confirm('Are you sure you want to delete this project?')) {
                        const projectKey = e.target.dataset.project;
                        delete savedProjects[projectKey];
                        localStorage.setItem('mermaidEditProjects', JSON.stringify(savedProjects));
                        showSavedProjectsModal(savedProjects); // Refresh the modal
                        showNotification('Project deleted successfully.', 'success');
                    }
                });
            });

            modal.classList.remove('hidden');
        }

        function showNotification(message, type = 'info') {
            // Create notification element
            const notification = document.createElement('div');
            const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';

            notification.className = `fixed top-4 right-4 ${bgColor} text-white px-4 py-2 rounded-md shadow-lg z-50 transition-opacity duration-300`;
            notification.textContent = message;

            document.body.appendChild(notification);

            // Auto-remove after 3 seconds
            setTimeout(() => {
                notification.style.opacity = '0';
                setTimeout(() => {
                    if (notification.parentElement) {
                        document.body.removeChild(notification);
                    }
                }, 300);
            }, 3000);
        }

        // --- Export Functions ---
        function exportToPNG() {
            const dataURL = canvas.toDataURL({
                format: 'png',
                quality: 1,
                multiplier: 2 // Higher resolution
            });

            const link = document.createElement('a');
            link.download = 'mermaid-chart.png';
            link.href = dataURL;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        function exportToSVG() {
            const svgString = canvas.toSVG({
                suppressPreamble: false,
                width: canvas.getWidth(),
                height: canvas.getHeight(),
                viewBox: {
                    x: 0,
                    y: 0,
                    width: canvas.getWidth(),
                    height: canvas.getHeight()
                }
            });

            const blob = new Blob([svgString], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.download = 'mermaid-chart.svg';
            link.href = url;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            URL.revokeObjectURL(url);
        }

        function exportToPDF() {
            const { jsPDF } = window.jspdf;

            // Get canvas dimensions
            const canvasWidth = canvas.getWidth();
            const canvasHeight = canvas.getHeight();

            // Calculate PDF dimensions (A4 size with margins)
            const pdfWidth = 210; // A4 width in mm
            const pdfHeight = 297; // A4 height in mm
            const margin = 20; // margin in mm
            const maxWidth = pdfWidth - (2 * margin);
            const maxHeight = pdfHeight - (2 * margin);

            // Calculate scale to fit canvas in PDF
            const scaleX = maxWidth / (canvasWidth * 0.264583); // Convert pixels to mm
            const scaleY = maxHeight / (canvasHeight * 0.264583);
            const scale = Math.min(scaleX, scaleY, 1); // Don't scale up

            const finalWidth = (canvasWidth * 0.264583 * scale);
            const finalHeight = (canvasHeight * 0.264583 * scale);

            // Center the image on the page
            const x = (pdfWidth - finalWidth) / 2;
            const y = (pdfHeight - finalHeight) / 2;

            // Get canvas as image
            const dataURL = canvas.toDataURL({
                format: 'png',
                quality: 1,
                multiplier: 2
            });

            // Create PDF
            const pdf = new jsPDF({
                orientation: finalWidth > finalHeight ? 'landscape' : 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            // Add title
            pdf.setFontSize(16);
            pdf.text('Mermaid Chart', margin, margin);

            // Add the canvas image
            pdf.addImage(dataURL, 'PNG', x, y + 10, finalWidth, finalHeight);

            // Save the PDF
            pdf.save('mermaid-chart.pdf');
        }

        // --- Ruler Drawing and Syncing ---
        const rulerHorizontal = document.getElementById('ruler-horizontal');
        const rulerVertical = document.getElementById('ruler-vertical');

        function drawRuler(element, length, isHorizontal) {
            // Clear existing ruler marks
            element.innerHTML = '';

            const zoom = canvas.getZoom();
            const vpt = canvas.viewportTransform;
            const offset = isHorizontal ? (vpt ? vpt[4] : 0) : (vpt ? vpt[5] : 0);

            // Calculate starting position and step
            const start = Math.floor(-offset / zoom / 10) * 10;
            const end = Math.ceil((length - offset) / zoom / 10) * 10;

            for (let i = start; i <= end; i += 10) {
                const pos = (i * zoom) + offset;
                if (pos < 0 || pos > length) continue;

                const isMajor = i % 50 === 0;

                // Create tick mark
                const tick = document.createElement('div');
                tick.style.position = 'absolute';
                tick.style.backgroundColor = '#666';

                if (isHorizontal) {
                    tick.style.left = pos + 'px';
                    tick.style.top = (isMajor ? '20px' : '25px');
                    tick.style.width = '1px';
                    tick.style.height = (isMajor ? '10px' : '5px');
                } else {
                    tick.style.top = pos + 'px';
                    tick.style.left = (isMajor ? '20px' : '25px');
                    tick.style.height = '1px';
                    tick.style.width = (isMajor ? '10px' : '5px');
                }

                element.appendChild(tick);

                // Add label for major ticks
                if (isMajor && i !== 0) {
                    const label = document.createElement('div');
                    label.style.position = 'absolute';
                    label.style.fontSize = '10px';
                    label.style.color = '#666';
                    label.style.fontFamily = 'Inter, sans-serif';
                    label.textContent = Math.abs(i).toString();

                    if (isHorizontal) {
                        label.style.left = (pos - 8) + 'px';
                        label.style.top = '5px';
                        label.style.textAlign = 'center';
                    } else {
                        label.style.top = (pos - 6) + 'px';
                        label.style.left = '5px';
                        label.style.width = '15px';
                        label.style.textAlign = 'center';
                        label.style.transform = 'rotate(-90deg)';
                        label.style.transformOrigin = 'center';
                    }

                    element.appendChild(label);
                }
            }
        }

        function updateRulers() {
            if (!rulerHorizontal || !rulerVertical) return;

            const canvasRect = canvas.getElement().getBoundingClientRect();
            drawRuler(rulerHorizontal, canvasRect.width, true);
            drawRuler(rulerVertical, canvasRect.height, false);
        }

        function resizeRulers() {
            if (!rulerHorizontal || !rulerVertical) return;

            const canvasRect = canvas.getElement().getBoundingClientRect();

            rulerHorizontal.style.width = canvasRect.width + 'px';
            rulerHorizontal.style.height = '30px';

            rulerVertical.style.height = canvasRect.height + 'px';
            rulerVertical.style.width = '30px';

            updateRulers();
        }

        // Bind ruler updates to canvas events
        canvas.on('after:render', () => {
            requestAnimationFrame(updateRulers);
        });

        canvas.on('viewport:changed', () => {
            requestAnimationFrame(updateRulers);
        });

        // --- Initial Setup ---
        // --- Snap to Grid and Alignment Functions ---
        function enableSnapToGrid() {
            canvas.on('object:moving', snapToGrid);
        }

        function snapToGrid(options) {
            const gridSize = 20;
            const obj = options.target;

            // Calculate snapped position
            const snappedLeft = Math.round(obj.left / gridSize) * gridSize;
            const snappedTop = Math.round(obj.top / gridSize) * gridSize;

            obj.set({
                left: snappedLeft,
                top: snappedTop
            });
        }

        function alignSelectedObjects(alignment) {
            const activeSelection = canvas.getActiveObject();

            if (!activeSelection) {
                showNotification('No objects selected for alignment', 'warning');
                return;
            }

            let objects = [];

            if (activeSelection.type === 'activeSelection') {
                objects = activeSelection.getObjects();
            } else {
                objects = [activeSelection];
            }

            if (objects.length < 2 && !['left', 'center', 'right', 'top', 'middle', 'bottom'].includes(alignment)) {
                showNotification('Select multiple objects for alignment', 'warning');
                return;
            }

            // Get canvas bounds for single object alignment to canvas
            const canvasBounds = {
                left: 0,
                top: 0,
                width: canvas.getWidth(),
                height: canvas.getHeight(),
                centerX: canvas.getWidth() / 2,
                centerY: canvas.getHeight() / 2
            };

            switch (alignment) {
                case 'left':
                    if (objects.length === 1) {
                        // Align to canvas left
                        objects[0].set('left', 50);
                    } else {
                        // Align multiple objects to leftmost
                        const leftmost = Math.min(...objects.map(obj => obj.left));
                        objects.forEach(obj => obj.set('left', leftmost));
                    }
                    break;

                case 'center':
                    if (objects.length === 1) {
                        // Center on canvas
                        objects[0].set('left', canvasBounds.centerX);
                    } else {
                        // Center align multiple objects
                        const centerX = objects.reduce((sum, obj) => sum + obj.left, 0) / objects.length;
                        objects.forEach(obj => obj.set('left', centerX));
                    }
                    break;

                case 'right':
                    if (objects.length === 1) {
                        // Align to canvas right
                        objects[0].set('left', canvas.getWidth() - 50);
                    } else {
                        // Align multiple objects to rightmost
                        const rightmost = Math.max(...objects.map(obj => obj.left));
                        objects.forEach(obj => obj.set('left', rightmost));
                    }
                    break;

                case 'top':
                    if (objects.length === 1) {
                        // Align to canvas top
                        objects[0].set('top', 50);
                    } else {
                        // Align multiple objects to topmost
                        const topmost = Math.min(...objects.map(obj => obj.top));
                        objects.forEach(obj => obj.set('top', topmost));
                    }
                    break;

                case 'middle':
                    if (objects.length === 1) {
                        // Center vertically on canvas
                        objects[0].set('top', canvasBounds.centerY);
                    } else {
                        // Middle align multiple objects
                        const centerY = objects.reduce((sum, obj) => sum + obj.top, 0) / objects.length;
                        objects.forEach(obj => obj.set('top', centerY));
                    }
                    break;

                case 'bottom':
                    if (objects.length === 1) {
                        // Align to canvas bottom
                        objects[0].set('top', canvas.getHeight() - 50);
                    } else {
                        // Align multiple objects to bottommost
                        const bottommost = Math.max(...objects.map(obj => obj.top));
                        objects.forEach(obj => obj.set('top', bottommost));
                    }
                    break;

                case 'distribute':
                    if (objects.length < 3) {
                        showNotification('Need at least 3 objects to distribute', 'warning');
                        return;
                    }

                    // Sort objects by horizontal position
                    const sortedObjects = [...objects].sort((a, b) => a.left - b.left);
                    const leftmostX = sortedObjects[0].left;
                    const rightmostX = sortedObjects[sortedObjects.length - 1].left;
                    const totalWidth = rightmostX - leftmostX;
                    const spacing = totalWidth / (sortedObjects.length - 1);

                    sortedObjects.forEach((obj, index) => {
                        if (index > 0 && index < sortedObjects.length - 1) {
                            obj.set('left', leftmostX + (spacing * index));
                        }
                    });
                    break;
            }

            // Update connections if objects have them
            objects.forEach(obj => {
                if (obj.isShapeGroup || obj.isSubgraph || obj.isActor || obj.isClass || obj.isEntity || obj.isTask || obj.isMilestone || obj.isJourneyStep) {
                    updateConnectionsFor(obj);
                }
            });

            canvas.renderAll();

            // Show alignment toolbar if multiple objects are selected
            const alignmentToolbar = document.getElementById('alignment-toolbar');
            if (objects.length > 1) {
                alignmentToolbar.classList.add('visible');
            } else {
                alignmentToolbar.classList.remove('visible');
            }

            showNotification(`Objects aligned: ${alignment}`, 'success');
        }

        function initializeApp() {
            setupEventListeners();
            setupMobilePanelToggle();
            setMode('select');
            makeDraggable(document.getElementById('tool-palette'));
            makeDraggable(document.getElementById('layers-panel'));
            resizeCanvas();

            // Enable grid and snap by default
            document.getElementById('toggle-grid').classList.add('active');
            document.getElementById('toggle-snap').classList.add('active');
            canvasWrapper.classList.add('grid-background');
            enableSnapToGrid();

            // Generate initial empty mermaid with a delay to ensure DOM is ready
            setTimeout(() => {
                generateAndRenderMermaid();
            }, 100);

            // Global context menu listeners
            document.addEventListener('contextmenu', (e) => {
                // Prevent default context menu everywhere
                e.preventDefault();
            });

            // Global click listener to hide context menu
            document.addEventListener('click', (e) => {
                hideContextMenu();
            });
        }

        initializeApp();

        // --- Layers Panel JavaScript Implementation ---
        const layersPanel = document.getElementById('layers-panel');
        const layersList = document.getElementById('layers-list');
        const addLayerBtn = document.getElementById('add-layer-btn');
        const closeLayersBtn = document.getElementById('close-layers-panel');

        // State for layers
        let layersData = [];
        let activeLayerId = 'layer-0';

        // Initialize Layer System
        function initializeLayers() {
            layersData = [];
            // Create a default base layer for existing objects
            const baseLayer = {
                id: 'layer-0',
                name: 'Default Layer',
                visible: true,
                objectIds: new Set()
            };
            layersData.push(baseLayer);
            refreshLayersUI();
            assignExistingObjectsToLayer();
        }

        // Assign existing canvas objects to the default layer
        function assignExistingObjectsToLayer() {
            const canvasObjects = canvas.getObjects();
            canvasObjects.forEach(obj => {
                if (!obj.id) return; // ignore objects without id
                // Assign only shapes and groups to layers
                if (obj.isShapeGroup || obj.isSubgraph || obj.isActor || obj.isClass || obj.isEntity || obj.isTask || obj.isMilestone || obj.isJourneyStep || obj.isNote || obj.isText) {
                    layersData[0].objectIds.add(obj.id);
                }
            });
            updateCanvasVisibility();
        }

        // Refresh Layers List UI
        function refreshLayersUI() {
            layersList.innerHTML = '';
            layersData.forEach((layer, index) => {
                const layerItem = document.createElement('li');
                layerItem.className = 'layer-item' + (layer.id === activeLayerId ? ' active' : '');
                layerItem.dataset.layerId = layer.id;

                // Visibility icon
                const visibilityIcon = document.createElement('span');
                visibilityIcon.className = 'layer-visibility';
                visibilityIcon.innerHTML = layer.visible ? '<i class="fa fa-eye"></i>' : '<i class="fa fa-eye-slash"></i>';
                visibilityIcon.title = layer.visible ? 'Hide Layer' : 'Show Layer';
                visibilityIcon.style.color = layer.visible ? '#4f46e5' : '#9ca3af';

                visibilityIcon.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleLayerVisibility(layer.id);
                });

                // Layer name span
                const layerName = document.createElement('span');
                layerName.className = 'layer-name';
                layerName.textContent = layer.name;

                // Action buttons container
                const actions = document.createElement('div');
                actions.className = 'layer-actions';

                // Duplicate button
                const duplicateBtn = document.createElement('button');
                duplicateBtn.className = 'layer-action-btn';
                duplicateBtn.title = 'Duplicate Layer';
                duplicateBtn.innerHTML = '<i class="fa fa-copy"></i>';

                duplicateBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    duplicateLayer(layer.id);
                });

                // Delete button
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'layer-action-btn';
                deleteBtn.title = 'Delete Layer';
                deleteBtn.innerHTML = '<i class="fa fa-trash"></i>';

                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteLayer(layer.id);
                });

                // Disable deletion for base layer
                if (index === 0) {
                    deleteBtn.disabled = true;
                    deleteBtn.style.opacity = '0.3';
                    deleteBtn.style.cursor = 'not-allowed';
                }

                actions.appendChild(duplicateBtn);
                actions.appendChild(deleteBtn);

                layerItem.appendChild(visibilityIcon);
                layerItem.appendChild(layerName);
                layerItem.appendChild(actions);

                // Layer selection
                layerItem.addEventListener('click', () => {
                    selectLayer(layer.id);
                });

                layersList.appendChild(layerItem);
            });
        }

        // Select layer
        function selectLayer(layerId) {
            if (activeLayerId === layerId) return;

            activeLayerId = layerId;

            const items = layersList.querySelectorAll('.layer-item');
            items.forEach(item => {
                item.classList.toggle('active', item.dataset.layerId === layerId);
            });

            showNotification(`Selected layer: ${getLayerById(layerId)?.name || ''}`, 'info');
        }

        // Toggle layer visibility
        function toggleLayerVisibility(layerId) {
            const layer = getLayerById(layerId);
            if (!layer) return;

            layer.visible = !layer.visible;

            // Update UI
            refreshLayersUI();

            // Update canvas objects visibility
            updateCanvasVisibility();

            showNotification(layer.visible ? `Layer '${layer.name}' is now visible` : `Layer '${layer.name}' is hidden`, layer.visible ? 'success' : 'warning');
        }

        // Update canvas visibility based on layers
        function updateCanvasVisibility() {
            const objMap = new Map();
            for (const layer of layersData) {
                for (const objId of layer.objectIds) {
                    objMap.set(objId, layer.visible);
                }
            }
            canvas.getObjects().forEach(obj => {
                if (!obj.id) return;
                if (objMap.has(obj.id)) {
                    obj.visible = objMap.get(obj.id);
                } else {
                    // If object not assigned to any layer, default to visible
                    obj.visible = true;
                }
            });
            canvas.renderAll();
        }

        // Get layer by ID
        function getLayerById(id) {
            return layersData.find(l => l.id === id);
        }

        // Add a new layer
        function addLayer() {
            const newId = `layer-${Date.now().toString(36)}`;
            let newName = prompt('Enter a name for the new layer:', 'New Layer');
            if (newName === null) return; // Cancelled
            newName = newName.trim();
            if (!newName) newName = 'New Layer';

            const newLayer = {
                id: newId,
                name: newName,
                visible: true,
                objectIds: new Set()
            };

            layersData.push(newLayer);
            refreshLayersUI();

            showNotification(`Layer '${newName}' added`, 'success');
        }

        // Delete a layer
        function deleteLayer(layerId) {
            if (layerId === 'layer-0') {
                showNotification('Cannot delete the default layer', 'error');
                return;
            }

            // Find layer index
            const index = layersData.findIndex(l => l.id === layerId);
            if (index === -1) return;

            const layerName = layersData[index].name;

            // Transfer objects to default layer
            const objectsToMove = layersData[index].objectIds;
            objectsToMove.forEach(objId => layersData[0].objectIds.add(objId));

            // Remove layer
            layersData.splice(index, 1);
            if (activeLayerId === layerId) {
                activeLayerId = 'layer-0';
            }
            refreshLayersUI();

            updateCanvasVisibility();

            showNotification(`Layer '${layerName}' deleted and objects moved to Default Layer`, 'success');
        }

        // Duplicate a layer
        function duplicateLayer(layerId) {
            const layer = getLayerById(layerId);
            if (!layer) return;

            const newId = `layer-${Date.now().toString(36)}`;
            const newName = `${layer.name} Copy`;

            // Duplicate objectIds
            const newObjectIds = new Set();
            layer.objectIds.forEach(objId => newObjectIds.add(objId));

            layersData.push({
                id: newId,
                name: newName,
                visible: layer.visible,
                objectIds: newObjectIds
            });
            refreshLayersUI();
            showNotification(`Layer '${newName}' created as duplicate`, 'success');
        }

        // Add object to current active layer
        function addObjectToActiveLayer(obj) {
            if (!obj.id) return;
            const layer = getLayerById(activeLayerId);
            if (!layer) return;

            // Remove obj from any other layers
            layersData.forEach(l => l.objectIds.delete(obj.id));

            // Add to active layer
            layer.objectIds.add(obj.id);

            updateCanvasVisibility();
            refreshLayersUI();

            showNotification(`Added object to layer '${layer.name}'`, 'info');
        }

        // Remove object from layers
        function removeObjectFromLayers(objId) {
            layersData.forEach(l => l.objectIds.delete(objId));
            updateCanvasVisibility();
            refreshLayersUI();
        }

        // Listen to canvas object additions and removals to maintain layer data
        canvas.on('object:added', e => {
            const obj = e.target;
            if (!obj || !obj.id) return;
            // Default add to active layer for new objects
            if (obj.isShapeGroup || obj.isSubgraph || obj.isActor || obj.isClass || obj.isEntity || obj.isTask || obj.isMilestone || obj.isJourneyStep || obj.isNote || obj.isText) {
                addObjectToActiveLayer(obj);
            }
        });

        canvas.on('object:removed', e => {
            const obj = e.target;
            if (!obj || !obj.id) return;
            removeObjectFromLayers(obj.id);
        });

        // Update layer object assignment on object selection
        canvas.on('selection:created', e => {
            const activeObject = e.selected?.[0] || e.target;
            if (activeObject && activeObject.id && (activeObject.isShapeGroup || activeObject.isSubgraph || activeObject.isActor || activeObject.isClass || activeObject.isEntity || activeObject.isTask || activeObject.isMilestone || activeObject.isJourneyStep || activeObject.isNote || activeObject.isText)) {
                // Optionally move selected object to active layer
                // Uncomment the line below if you want this behavior:
                // addObjectToActiveLayer(activeObject);
            }
        });

        // Add user controls to toggle layers panel visibility
        function setupLayersPanelToggle() {
            const mobileToggle = document.getElementById('mobile-panel-toggle');

            if (mobileToggle) {
                mobileToggle.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    layersPanel.classList.toggle('visible');
                });
            }

            // Add keyboard shortcut to toggle layers panel
            window.addEventListener('keydown', (e) => {
                if (e.key.toLowerCase() === 'l' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    layersPanel.classList.toggle('visible');
                }
            });

            // Close button
            closeLayersBtn.addEventListener('click', () => {
                layersPanel.classList.remove('visible');
            });

            // Add event listener for the main layers button in toolbar
            const layersBtn = document.getElementById('layers-btn');
            if (layersBtn) {
                layersBtn.addEventListener('click', () => {
                    layersPanel.classList.toggle('visible');
                });
            } else {
                console.error('Layers button not found in DOM');
            }
        }

        // Initialize Layers panel and functionality
        function initializeLayersPanel() {
            initializeLayers();
            setupLayersPanelToggle();

            addLayerBtn.addEventListener('click', () => addLayer());
        }

        // Integrate layer data with project save/load
        function getLayersData() {
            return {
                layers: layersData.map(layer => ({
                    id: layer.id,
                    name: layer.name,
                    visible: layer.visible,
                    objectIds: Array.from(layer.objectIds)
                })),
                activeLayerId: activeLayerId
            };
        }

        function loadLayersData(data) {
            if (!data) return;

            layersData = data.layers.map(layer => ({
                ...layer,
                objectIds: new Set(layer.objectIds)
            }));

            activeLayerId = data.activeLayerId || 'layer-0';
            refreshLayersUI();
            updateCanvasVisibility();
        }

        // Override the existing getProjectData function to include layers
        const originalGetProjectData = getProjectData;
        getProjectData = function() {
            const projectData = originalGetProjectData();
            projectData.layersData = getLayersData();
            return projectData;
        };

        // Override the existing loadProjectData function to include layers
        const originalLoadProjectData = loadProjectData;
        loadProjectData = function(projectData) {
            const result = originalLoadProjectData(projectData);
            if (projectData.layersData) {
                loadLayersData(projectData.layersData);
            }
            return result;
        };

        // Call initialization after main app init
        initializeLayersPanel();

        // Make the layers panel draggable
        makeDraggable(layersPanel);
