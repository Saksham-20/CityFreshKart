// Vegetable Products Data for FrashCart
// Products are managed through the admin panel — this is the static fallback & helper functions

export const vegetableProducts = [
    {
        id: 1,
        name: 'Fresh Tomatoes (Tamatar)',
        category: 'Sabzi & Greens',
        price: 40,
        image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&q=80',
        rating: 4.5,
        reviews: 234,
        featured: true,
        weight: '1 kg',
        description: 'Farm-fresh red tomatoes, perfect for sabzi and salads'
    },
    {
        id: 2,
        name: 'Palak (Spinach)',
        category: 'Sabzi & Greens',
        price: 30,
        image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&q=80',
        rating: 4.3,
        reviews: 189,
        featured: true,
        weight: '500 g',
        description: 'Fresh green spinach leaves, rich in iron'
    },
    {
        id: 3,
        name: 'Aloo (Potato)',
        category: 'Root Vegetables',
        price: 35,
        image: 'https://images.unsplash.com/photo-1590165482129-1b8b27698780?w=400&q=80',
        rating: 4.7,
        reviews: 456,
        featured: true,
        weight: '1 kg',
        description: 'Premium quality potatoes for every kitchen'
    },
    {
        id: 4,
        name: 'Pyaaz (Onion)',
        category: 'Root Vegetables',
        price: 45,
        image: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=400&q=80',
        rating: 4.4,
        reviews: 312,
        featured: true,
        weight: '1 kg',
        description: 'Fresh red onions, essential for Indian cooking'
    },
    {
        id: 5,
        name: 'Shimla Mirch (Capsicum)',
        category: 'Sabzi & Greens',
        price: 60,
        image: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=400&q=80',
        rating: 4.2,
        reviews: 145,
        featured: false,
        weight: '500 g',
        description: 'Crunchy bell peppers in vibrant colors'
    },
    {
        id: 6,
        name: 'Gajar (Carrots)',
        category: 'Root Vegetables',
        price: 50,
        image: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400&q=80',
        rating: 4.6,
        reviews: 267,
        featured: false,
        weight: '1 kg',
        description: 'Fresh orange carrots, great for gajar ka halwa'
    },
    {
        id: 7,
        name: 'Dhania (Coriander)',
        category: 'Exotic & Herbs',
        price: 15,
        image: 'https://images.unsplash.com/photo-1592921870789-04563d55041c?w=400&q=80',
        rating: 4.5,
        reviews: 198,
        featured: false,
        weight: '100 g',
        description: 'Freshly cut coriander leaves for garnishing'
    },
    {
        id: 8,
        name: 'Kela (Banana)',
        category: 'Fruits',
        price: 50,
        image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&q=80',
        rating: 4.8,
        reviews: 523,
        featured: true,
        weight: '1 dozen',
        description: 'Sweet ripe bananas, naturally ripened'
    }
];

// Helper functions
export const getFeaturedProducts = () => {
    return vegetableProducts.filter(product => product.featured);
};

export const getProductsByCategory = (category) => {
    return vegetableProducts.filter(product => product.category === category);
};

export const getProductById = (id) => {
    return vegetableProducts.find(product => product.id === id);
};

export const getRandomProducts = (count = 4) => {
    const shuffled = [...vegetableProducts].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
};
