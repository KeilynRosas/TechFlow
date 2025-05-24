// js/modalcadastro.js

// A função initializeCadastroModal será chamada APÓS o HTML do modal ser injetado no DOM
function initializeCadastroModal() {
    const cadastroModal = document.getElementById('cadastroModal');
    const closeCadastroModalButton = document.getElementById('closeCadastroModal');
    // É crucial que os botões com 'open-cadastro-modal' existam ANTES da inicialização
    // ou que essa lógica seja executada após a injeção do HTML da página principal
    // (o que já acontece com DOMContentLoaded no index.html)
    const openCadastroModalButtons = document.querySelectorAll('.open-cadastro-modal');

    // Verifica se o modal principal foi encontrado, caso contrário, não faz nada
    if (!cadastroModal) {
        console.warn("Elemento #cadastroModal não encontrado. O modal pode não ter sido carregado ainda ou o ID está incorreto.");
        return; 
    }

    function openModal() {
        if (cadastroModal) {
            cadastroModal.classList.remove('hidden');
        }
    }

    function closeModal() {
        if (cadastroModal) {
            cadastroModal.classList.add('hidden');
        }
    }

    // Adiciona evento de clique a TODOS os botões com a classe 'open-cadastro-modal'
    openCadastroModalButtons.forEach(button => {
        button.addEventListener('click', openModal);
    });

    // Adiciona evento de clique ao botão de fechar
    if (closeCadastroModalButton) {
        closeCadastroModalButton.addEventListener('click', closeModal);
    }

    // Adiciona evento de clique para fechar ao clicar fora do modal (no overlay)
    if (cadastroModal) {
        cadastroModal.addEventListener('click', function(event) {
            if (event.target === cadastroModal) { // Verifica se o clique foi diretamente no overlay
                closeModal();
            }
        });
    }

    // Adiciona evento para fechar com a tecla 'Esc'
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && !cadastroModal.classList.contains('hidden')) {
            closeModal();
        }
    });

    // Lógica do formulário
    const cadastroForm = document.getElementById('cadastroForm');
    if (cadastroForm) {
        cadastroForm.addEventListener('submit', function(event) {
            event.preventDefault(); // Impede o envio real do formulário

            const nome = document.getElementById('nome').value;
            const email = document.getElementById('email_cadastro').value;
            const senha = document.getElementById('senha_cadastro').value;
            const confirmarSenha = document.getElementById('confirmar_senha').value;

            if (senha !== confirmarSenha) {
                alert('As senhas não coincidem!');
                return;
            }

            console.log('Dados do Cadastro:', { nome, email, senha });
            alert('Cadastro (simulado) realizado com sucesso! Verifique o console.');
            
            // Aqui você adicionaria a lógica para enviar os dados para o Flask
            // Ex: fetch('/registrar', { method: 'POST', body: new FormData(cadastroForm) }) ...

            closeModal(); // Fecha o modal após o envio (ou simulação)
        });
    }

    console.log("Modal de cadastro inicializado.");
}

// Exporta a função para que ela possa ser chamada do script principal (index.html)
window.initializeCadastroModal = initializeCadastroModal;