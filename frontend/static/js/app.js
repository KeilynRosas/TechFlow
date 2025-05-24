// Controle do menu mobile
document.addEventListener('DOMContentLoaded', function() {
    const navToggle = document.getElementById('nav-toggle');
    const navContent = document.getElementById('nav-content');

    if (navToggle && navContent) {
        navToggle.addEventListener('click', function() {
            navContent.classList.toggle('hidden');
            this.classList.toggle('text-[#3591E8]'); // Adiciona cor ao ícone
        });
    }
});
// Cabeçalho tela inicial
document.addEventListener('DOMContentLoaded', function() {
    const carousel = document.getElementById('testimonial-carousel');
    const items = carousel.children;
    const indicators = document.querySelectorAll('#carousel-indicators button');
    let currentIndex = 0;

    function updateCarousel() {
        carousel.style.transform = `translateX(-${currentIndex * 100}%)`;
        indicators.forEach((indicator, index) => {
            indicator.classList.toggle('bg-[#3591E8]', index === currentIndex);
            indicator.classList.toggle('bg-gray-300', index !== currentIndex);
        });
    }

    document.getElementById('next-testimonial').addEventListener('click', () => {
        currentIndex = (currentIndex + 1) % items.length;
        updateCarousel();
    });

    document.getElementById('prev-testimonial').addEventListener('click', () => {
        currentIndex = (currentIndex - 1 + items.length) % items.length;
        updateCarousel();
    });

    indicators.forEach((indicator, index) => {
        indicator.addEventListener('click', () => {
            currentIndex = index;
            updateCarousel();
        });
    });
});

