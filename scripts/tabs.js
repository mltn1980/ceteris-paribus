// ============================================
// TABS.JS - Sistemas de pestañas
// ============================================

function initTabSystem({ tabSelector, contentSelector, dataAttr, activeColor, extraSelector }) {
    const tabs = document.querySelectorAll(tabSelector);
    if (!tabs.length) return;

    tabs.forEach(tab => {
        tab.addEventListener('click', function () {
            const value = this.getAttribute(dataAttr);

            tabs.forEach(t => {
                t.classList.remove('active');
                t.style.borderBottomColor = 'transparent';
                t.style.color = 'var(--text2)';
                t.style.background = 'transparent';
            });
            this.classList.add('active');
            this.style.borderBottomColor = activeColor;
            this.style.color = 'var(--text)';
            this.style.background = 'var(--surface)';

            document.querySelectorAll(contentSelector).forEach(c => {
                c.style.display = 'none';
                c.classList.remove('active');
            });

            if (extraSelector) {
                document.querySelectorAll(extraSelector).forEach(b => b.style.display = 'none');
            }

            const target = document.querySelector(`${contentSelector}[${dataAttr}="${value}"]`);
            if (target) {
                target.style.display = 'block';
                target.classList.add('active');
            }

            if (extraSelector) {
                const extraTarget = document.querySelector(`${extraSelector}[${dataAttr}="${value}"]`);
                if (extraTarget) extraTarget.style.display = 'block';
            }

            // Deslizar el tab activo al borde izquierdo del contenedor
            const container = this.parentElement;
            const tabLeft = this.getBoundingClientRect().left - container.getBoundingClientRect().left + container.scrollLeft;
            container.scrollTo({ left: tabLeft });
        });
    });

    // Aplicar estilos al tab activo inicial
    const activeTab = document.querySelector(`${tabSelector}.active`);
    if (activeTab) {
        activeTab.style.borderBottomColor = activeColor;
        activeTab.style.color = 'var(--text)';
        activeTab.style.background = 'var(--surface)';
    }
}

initTabSystem({
    tabSelector: '.ganaderia-tab',
    contentSelector: '.ganaderia-content',
    dataAttr: 'data-ganaderia',
    activeColor: 'var(--red)'
});

initTabSystem({
    tabSelector: '.grain-tab',
    contentSelector: '.grain-content',
    dataAttr: 'data-grain',
    activeColor: 'var(--amber)',
    extraSelector: '.grain-button'
});

initTabSystem({
    tabSelector: '.lacteos-tab',
    contentSelector: '.lacteos-content',
    dataAttr: 'data-lacteos',
    activeColor: '#4a90e2'
});

initTabSystem({
    tabSelector: '.uruguay-tab',
    contentSelector: '.uruguay-content',
    dataAttr: 'data-uruguay',
    activeColor: 'var(--green)'
});

initTabSystem({
    tabSelector: '.deuda-tab',
    contentSelector: '.deuda-content',
    dataAttr: 'data-deuda',
    activeColor: 'var(--green)'
});

initTabSystem({
    tabSelector: '.pbi-tab',
    contentSelector: '.pbi-content',
    dataAttr: 'data-pbi',
    activeColor: 'var(--blue)'
});

initTabSystem({
    tabSelector: '.fin-tab',
    contentSelector: '.fin-content',
    dataAttr: 'data-fin',
    activeColor: '#0f5c6b'
});

// ============================================
// COLAPSAR/EXPANDIR
// ============================================
function toggleCollapsible(header) {
    const content = header.nextElementSibling;
    const toggleText = header.querySelector('.toggle-text');
    if (!content) return;

    const isCollapsed = content.classList.contains('collapsed');

    if (isCollapsed) {
        content.style.display = '';
        content.classList.remove('collapsed');
        header.classList.remove('collapsed');
        if (toggleText) toggleText.textContent = '▲ Ocultar';
    } else {
        content.style.display = 'none';
        content.classList.add('collapsed');
        header.classList.add('collapsed');
        if (toggleText) toggleText.textContent = '▼ Mostrar';
    }
}

// Envuelve cada sección en un wrapper para que position:sticky quede acotado al section
document.querySelectorAll('.section-label.collapsible').forEach(function (header) {
    const content = header.nextElementSibling;
    if (content && content.classList.contains('collapsible-content')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'section-wrapper';
        header.parentNode.insertBefore(wrapper, header);
        wrapper.appendChild(header);
        wrapper.appendChild(content);
    }
    header.onclick = null;
    header.addEventListener('click', function () { toggleCollapsible(header); });
});

