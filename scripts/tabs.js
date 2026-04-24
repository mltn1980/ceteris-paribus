// ============================================
// TABS.JS - Sistemas de pestañas
// ============================================

// ============================================
// GANADERÍA - Sistema de pestañas
// ============================================
document.querySelectorAll('.ganaderia-tab').forEach(tab => {
    tab.addEventListener('click', function() {
        const target = this.getAttribute('data-ganaderia');
        
        // Actualizar botones
        document.querySelectorAll('.ganaderia-tab').forEach(t => {
            t.classList.remove('active');
            t.style.borderBottomColor = 'transparent';
            t.style.color = 'var(--text2)';
            t.style.background = 'transparent';
        });
        this.classList.add('active');
        this.style.borderBottomColor = 'var(--red)';
        this.style.color = 'var(--text)';
        this.style.background = 'var(--surface)';
        
        // Actualizar contenido
        document.querySelectorAll('.ganaderia-content').forEach(content => {
            content.style.display = 'none';
            content.classList.remove('active');
        });
        const targetContent = document.querySelector(`.ganaderia-content[data-ganaderia="${target}"]`);
        if (targetContent) {
            targetContent.style.display = 'block';
            targetContent.classList.add('active');
        }
    });
});

// ============================================
// GRANOS - Sistema de pestañas
// ============================================
document.querySelectorAll('.grain-tab').forEach(tab => {
    tab.addEventListener('click', function() {
        const grain = this.getAttribute('data-grain');
        
        // Remover active de todos los tabs
        document.querySelectorAll('.grain-tab').forEach(t => {
            t.classList.remove('active');
            t.style.borderBottomColor = 'transparent';
            t.style.color = 'var(--text2)';
            t.style.background = 'transparent';
        });
        
        // Activar tab clickeado
        this.classList.add('active');
        this.style.borderBottomColor = 'var(--amber)';
        this.style.color = 'var(--text)';
        this.style.background = 'var(--surface)';
        
        // Ocultar todos los contenidos
        document.querySelectorAll('.grain-content').forEach(content => {
            content.style.display = 'none';
        });
        
        // Ocultar todos los botones
        document.querySelectorAll('.grain-button').forEach(btn => {
            btn.style.display = 'none';
        });
        
        // Mostrar contenido seleccionado
        document.querySelector(`.grain-content[data-grain="${grain}"]`).style.display = 'block';
        
        // Mostrar botón correspondiente si existe
        const grainButton = document.querySelector(`.grain-button[data-grain="${grain}"]`);
        if (grainButton) {
            grainButton.style.display = 'block';
        }
    });
});

// Activar el tab "General" por defecto
const activeGrainTab = document.querySelector('.grain-tab.active');
if (activeGrainTab) {
    activeGrainTab.style.borderBottomColor = 'var(--amber)';
    activeGrainTab.style.color = 'var(--text)';
    activeGrainTab.style.background = 'var(--surface)';
}

// ============================================
// LÁCTEOS - Sistema de pestañas
// ============================================
document.querySelectorAll('.lacteos-tab').forEach(tab => {
    tab.addEventListener('click', function() {
        const lacteos = this.getAttribute('data-lacteos');
        
        // Remover active de todos los tabs de lácteos
        document.querySelectorAll('.lacteos-tab').forEach(t => {
            t.classList.remove('active');
            t.style.borderBottomColor = 'transparent';
            t.style.color = 'var(--text2)';
            t.style.background = 'transparent';
        });
        
        // Activar tab clickeado
        this.classList.add('active');
        this.style.borderBottomColor = '#4a90e2';
        this.style.color = 'var(--text)';
        this.style.background = 'var(--surface)';
        
        // Ocultar todos los contenidos de lácteos
        document.querySelectorAll('.lacteos-content').forEach(content => {
            content.style.display = 'none';
            content.classList.remove('active');
        });
        
        // Mostrar contenido seleccionado
        const selectedContent = document.querySelector(`.lacteos-content[data-lacteos="${lacteos}"]`);
        if (selectedContent) {
            selectedContent.style.display = 'block';
            selectedContent.classList.add('active');
        }
    });
});

// Activar el tab "Resumen" de lácteos por defecto
const activeTabLacteos = document.querySelector('.lacteos-tab.active');
if (activeTabLacteos) {
    activeTabLacteos.style.borderBottomColor = '#4a90e2';
    activeTabLacteos.style.color = 'var(--text)';
    activeTabLacteos.style.background = 'var(--surface)';
}

// ============================================
// COLAPSAR/EXPANDIR - Función global
// ============================================
window.toggleAllSections = function() {
    const collapsibleSections = document.querySelectorAll('.section-label.collapsible');
    const collapsibleContents = document.querySelectorAll('.collapsible-content');
    const toggleBtn = document.getElementById('toggleAll');
    const toggleText = document.getElementById('toggleText');
    
    // Verificar si hay alguna sección expandida
    const anyExpanded = Array.from(collapsibleSections).some(section => !section.classList.contains('collapsed'));
    
    if (anyExpanded) {
        // Colapsar todas
        collapsibleSections.forEach(section => {
            section.classList.add('collapsed');
            const toggleTextEl = section.querySelector('.toggle-text');
            if (toggleTextEl) toggleTextEl.textContent = '▼ Mostrar';
        });
        collapsibleContents.forEach(content => {
            content.classList.add('collapsed');
        });
        if (toggleText) toggleText.textContent = 'Expandir todo';
    } else {
        // Expandir todas
        collapsibleSections.forEach(section => {
            section.classList.remove('collapsed');
            const toggleTextEl = section.querySelector('.toggle-text');
            if (toggleTextEl) toggleTextEl.textContent = '▲ Ocultar';
        });
        collapsibleContents.forEach(content => {
            content.classList.remove('collapsed');
        });
        if (toggleText) toggleText.textContent = 'Colapsar todo';
    }
};
