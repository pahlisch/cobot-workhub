function app() {
    return {
        route: "https://cobot-bot-workhub-b4b7ac000c0c.herokuapp.com",
        date: new Date().toJSON().slice(0, 10),
        items: [],
        basket: [],
        cur: ' CHF',
        async fetchItems() {
            this.items = await this.getRoute('/meals');
        },
        async getRoute(endRoute) {
            try {
                const response = await fetch(this.route + endRoute);
                const data = await response.json();
                return data;
            } catch (error) {
                console.error("Error fetching data:", error);
                throw error;
            }
        },
        addToBasket(item) {
            this.basket.push(item);
            console.log(Array.from(this.basket));
        },
        removeFromBasket(index) {
            this.basket.splice(index, 1);
        },
        confirmBasket() {
            console.log(this.basket);
        },
        returnTotalBasketAmount() {
            let total = 0;
            for (let i=0; i < this.basket.length; i++){
                total = total + this.basket[i].price;
            }
            return total;
        }
    }
}