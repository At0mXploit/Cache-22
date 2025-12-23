const getProducts = () => 
    new Promise((resolve, reject) => {
    setTimeout(() => {
        resolve([
            {
                id: 1,
                name: "Product 1",
                price: 100
            },
        ]);
    }, 4000);
});

const getProductsDetail = (id) => 
    new Promise((resolve, reject) => {
    setTimeout(() => {
        resolve({
            id: id,
            name: `Product ${id}`,
            price: Math.floor(Math.random() * id * 100),
        });
    }, 4000);
});

module.exports = { getProducts, getProductsDetail };