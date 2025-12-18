// --- CONFIGURAÇÃO ---
// COLE AQUI A SUA URL ATUAL DO APPS SCRIPT
const API_URL = 'https://script.google.com/macros/s/AKfycbx8WGCG0nDntXroKFn0k5nHEWSVc0JB1IN_yDxri0DZFtBbZUlua5q29VL5j9ARvfxXiA/exec';

let projectsData = [];

document.addEventListener('DOMContentLoaded', function() {
    fetchProjects();
    setupEventListeners();
});

function setupEventListeners() {
    // Busca de Projeto
    const searchInput = document.getElementById('projectSearch');
    const projectList = document.getElementById('projectList');

    if(searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            projectList.style.display = 'block';
            const filtered = projectsData.filter(p => 
                String(p.id).toLowerCase().includes(term) || 
                p.projeto.toLowerCase().includes(term)
            );
            renderProjectList(filtered);
        });

        searchInput.addEventListener('focus', () => { 
            if(projectsData.length > 0) projectList.style.display = 'block'; 
        });
        
        searchInput.addEventListener('blur', () => { 
            setTimeout(() => projectList.style.display = 'none', 200); 
        });
    }
}

// --- FUNÇÕES DE BUSCA PROJETO ---

async function fetchProjects() {
    try {
        const res = await fetch(`${API_URL}?action=getProjetos`);
        const data = await res.json();
        const list = document.getElementById('projectList');
        
        if (data.projetos && data.projetos.length > 0) {
            projectsData = data.projetos;
            renderProjectList(projectsData);
        } else {
            list.innerHTML = '<div class="project-option">Nenhum projeto carregado.</div>';
        }
    } catch (e) { console.error(e); }
}

function renderProjectList(projects) {
    const list = document.getElementById('projectList');
    if(!list) return;
    list.innerHTML = '';
    if (projects.length === 0) {
        list.innerHTML = '<div class="project-option">Projeto não encontrado.</div>';
        return;
    }
    projects.forEach(p => {
        const div = document.createElement('div');
        div.className = 'project-option';
        div.innerHTML = `<strong>${p.id}</strong><small>${p.projeto}</small>`;
        div.onclick = () => selectProject(p);
        list.appendChild(div);
    });
}

function selectProject(projectObj) {
    const searchInput = document.getElementById('projectSearch');
    const projectList = document.getElementById('projectList');
    
    searchInput.value = projectObj.id;
    document.getElementById('selectedProjectId').value = projectObj.id;
    document.getElementById('selectedProjectName').value = projectObj.projeto;
    
    const feedback = document.getElementById('projectFeedback');
    feedback.style.display = 'block';
    feedback.innerHTML = `✅ Solicitando para: <strong>${projectObj.projeto}</strong>`;
    
    document.getElementById('userName').value = projectObj.coord;
    projectList.style.display = 'none';
}

// --- NAVEGAÇÃO ---

window.goToStep2 = function() {
    const projId = document.getElementById('selectedProjectId').value;
    const projName = document.getElementById('selectedProjectName').value;
    const name = document.getElementById('userName').value;
    const email = document.getElementById('userEmail').value;

    if (!projId) return alert("Por favor, selecione um projeto da lista.");
    if (!name || !email) return alert("Preencha todos os campos.");

    document.getElementById('summaryProject').textContent = `${projId} - ${projName}`;
    document.getElementById('summaryUser').textContent = name;
    document.getElementById('summaryEmail').textContent = email;

    document.getElementById('step1').classList.remove('active');
    document.getElementById('step2').classList.add('active');
    document.getElementById('pageTitle').textContent = "Seleção de Itens";
    document.getElementById('pageSubtitle').textContent = "Passo 2 de 2";

    fetchTerms(projId);
}

window.backToStep1 = function() {
    document.getElementById('step2').classList.remove('active');
    document.getElementById('step1').classList.add('active');
    document.getElementById('pageTitle').textContent = "Identificação";
    document.getElementById('pageSubtitle').textContent = "Passo 1 de 2";
    
    // Tenta limpar o grid se ele existir
    const grid = document.getElementById('termGrid');
    if (grid) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #999;">Carregando...</div>';
    }
    
    document.getElementById('selectedTermValue').value = "";
    document.getElementById('itemsContainer').style.display = 'none';
}

// --- LÓGICA DE TERMOS (Blocos) ---

async function fetchTerms(projectCode) {
    const grid = document.getElementById('termGrid');
    
    // PROTEÇÃO CONTRA O ERRO RELATADO
    if (!grid) {
        console.error("ERRO CRÍTICO: Elemento 'termGrid' não encontrado no HTML. Verifique se o arquivo termo.html foi atualizado.");
        alert("Erro no sistema: Interface desatualizada (Falta #termGrid).");
        return;
    }

    grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #999;">Carregando termos disponíveis...</div>';
    
    try {
        const res = await fetch(`${API_URL}?action=getTermos&projectCode=${encodeURIComponent(projectCode)}`);
        const data = await res.json();
        
        grid.innerHTML = ''; 
        
        if (data.termos && data.termos.length > 0) {
            data.termos.forEach(t => {
                const card = document.createElement('div');
                card.className = 'term-card';
                card.textContent = t.display; 
                card.onclick = () => selectTermBlock(card, t.full);
                grid.appendChild(card);
            });
        } else {
            grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center;">Nenhum termo disponível para este projeto</div>';
        }
    } catch (e) { 
        console.error(e);
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: red;">Erro ao carregar termos</div>';
    }
}

async function selectTermBlock(element, fullTermName) {
    document.querySelectorAll('.term-card').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');

    document.getElementById('selectedTermValue').value = fullTermName;

    const container = document.getElementById('itemsContainer');
    const list = document.getElementById('itemsList');
    const loader = document.getElementById('loadingItems');

    container.style.display = 'none';
    loader.style.display = 'block';
    list.innerHTML = '';

    try {
        const res = await fetch(`${API_URL}?action=getItens&termo=${encodeURIComponent(fullTermName)}`);
        const data = await res.json();
        if(data.itens && data.itens.length > 0) {
            renderItems(data.itens, list);
            container.style.display = 'block';
        } else {
            alert("Nenhum item disponível neste termo.");
        }
    } catch(e) { console.error(e); } 
    finally { loader.style.display = 'none'; }
}

function renderItems(itens, container) {
    itens.forEach(item => {
        const preco = item.preco.toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
        const row = document.createElement('div');
        row.className = 'item-row';
        row.innerHTML = `
            <div><input type="checkbox" class="chk" data-id="${item.id}"></div>
            <div class="col-details"><strong>${item.nome}</strong><br><small>${item.unidade} | ${preco}</small></div>
            <div class="col-meta">Disp: ${item.disponivel}</div>
            <div class="col-actions"><input type="number" id="qty-${item.id}" disabled min="1" max="${item.disponivel}"></div>
            <div class="price-display" id="total-${item.id}">-</div>
        `;
        container.appendChild(row);

        const chk = row.querySelector('.chk');
        const qty = row.querySelector(`#qty-${item.id}`);
        const total = row.querySelector(`#total-${item.id}`);

        chk.addEventListener('change', () => {
            qty.disabled = !chk.checked;
            if(chk.checked) qty.focus(); else { qty.value = ''; total.textContent = '-'; }
        });

        qty.addEventListener('input', () => {
            let v = parseInt(qty.value);
            if(v > item.disponivel) { v = item.disponivel; qty.value = v; alert("Máximo atingido"); }
            total.textContent = ((v||0) * item.preco).toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
        });
    });
}

window.submitOrder = async function() {
    const checks = document.querySelectorAll('.chk:checked');
    if(checks.length === 0) return alert("Selecione itens.");
    
    const termoSelecionado = document.getElementById('selectedTermValue').value;
    if(!termoSelecionado) return alert("Selecione um termo de fornecimento.");

    const itens = [];
    let valid = true;
    checks.forEach(c => {
        const id = c.dataset.id;
        const q = document.getElementById(`qty-${id}`).value;
        if(!q || q<1) valid = false;
        itens.push({ linha: id, qtd: q });
    });
    if(!valid) return alert("Verifique quantidades.");

    const btn = document.getElementById('btnSubmit');
    btn.innerText = "Enviando...";
    btn.disabled = true;

    const payload = {
        projeto: document.getElementById('selectedProjectId').value + " - " + document.getElementById('selectedProjectName').value,
        nome: document.getElementById('userName').value,
        email: document.getElementById('userEmail').value,
        termo: termoSelecionado,
        itens: itens
    };

    try {
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
        const json = await res.json();
        
        if(json.status === 'sucesso') {
            document.getElementById('mainHeader').style.display = 'none';
            document.getElementById('step2').classList.remove('active');
            document.getElementById('step3').classList.add('active');
        } else {
            throw new Error(json.mensagem);
        }
    } catch(e) {
        alert("Erro: " + e.message);
        btn.innerText = "Finalizar Solicitação";
        btn.disabled = false;
    }
}
