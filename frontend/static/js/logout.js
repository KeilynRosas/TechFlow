// frontend/static/js/logout.js

/**
 * @function handleLogout
 * @description Lida com o processo de logout do usuário.
 * Remove o token JWT do localStorage e redireciona para a página de login.
 */
function handleLogout() {
    // Remove o token JWT do localStorage. Isso efetivamente "desloga" o usuário no frontend.
    localStorage.removeItem('jwt_token');
    // Exibe um alerta de sucesso (opcional)
    alert('Você foi desconectado com sucesso.');
    // Redireciona o usuário para a página de login
    // Certifique-se de que o caminho para login.html está correto
    window.location.href = '/login.html';
}

// Adiciona um listener de evento ao botão de logout.
// O 'DOMContentLoaded' garante que o HTML esteja completamente carregado antes de tentar acessar o elemento.
document.addEventListener('DOMContentLoaded', () => {
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault(); // Previne o comportamento padrão do link (navegar diretamente)
            handleLogout(); // Chama a função de logout
        });
    } else {
        console.warn('Botão de logout com ID "logoutButton" não encontrado.');
    }
});