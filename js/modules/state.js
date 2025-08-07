export let connections = [];
export let currentMode = 'select';
export let lineStartShape = null;
export let activeLine = null;
export let currentEditingObject = null;
export let isPanning = false;
export let lastPosX, lastPosY;
export let flowchartDirection = 'TD';
export let diagramType = 'flowchart';
export let actors = [];
export let messages = [];
export let classes = [];
export let relationships = [];
export let entities = [];
export let erRelationships = [];
export let tasks = [];
export let milestones = [];
export let journeySteps = [];
export let journeySections = [];
export let layers = [];
export let currentLayerId = null;
export let layerIdCounter = 1;
export let clipboard = null;

export function setConnections(newConnections) {
    connections = newConnections;
}

export function setCurrentMode(newMode) {
    currentMode = newMode;
}

export function setLineStartShape(shape) {
    lineStartShape = shape;
}

export function setActiveLine(line) {
    activeLine = line;
}

export function setCurrentEditingObject(obj) {
    currentEditingObject = obj;
}

export function setPanning(panning) {
    isPanning = panning;
}

export function setLastPos(x, y) {
    lastPosX = x;
    lastPosY = y;
}

export function setFlowchartDirection(direction) {
    flowchartDirection = direction;
}

export function setDiagramType(type) {
    diagramType = type;
}

export function setActors(newActors) {
    actors = newActors;
}

export function setMessages(newMessages) {
    messages = newMessages;
}

export function setClasses(newClasses) {
    classes = newClasses;
}

export function setRelationships(newRelationships) {
    relationships = newRelationships;
}

export function setEntities(newEntities) {
    entities = newEntities;
}

export function setErRelationships(newErRelationships) {
    erRelationships = newErRelationships;
}

export function setTasks(newTasks) {
    tasks = newTasks;
}

export function setMilestones(newMilestones) {
    milestones = newMilestones;
}

export function setJourneySteps(newJourneySteps) {
    journeySteps = newJourneySteps;
}

export function setJourneySections(newJourneySections) {
    journeySections = newJourneySections;
}

export function setLayers(newLayers) {
    layers = newLayers;
}

export function setCurrentLayerId(id) {
    currentLayerId = id;
}

export function setLayerIdCounter(counter) {
    layerIdCounter = counter;
}

export function setClipboard(newClipboard) {
    clipboard = newClipboard;
}
