function app() {
    return {
        route: "https://cobot-bot-workhub-b4b7ac000c0c.herokuapp.com",
        date: new Date().toJSON().slice(0, 10),
        items: [],
        showModal: false,
        basket: [],
        future_orders: [],
        cur: ' CHF',
        async fetchItems() {
            this.items = await this.getRoute('/meals');
            this.future_orders = await this.getRoute('/orders/22');
            this.basket = await this.getRoute('/orderDetails/22/2023-09-30');
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
        async postRoute(endRoute, postData) {
            try {
                const response = await fetch(this.route + endRoute, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(postData)
                });
        
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                } 
                console.log(response)

            } catch (error) {
                console.error("Error posting data:", error);
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
            let meal_ids = [];
            
            if (this.basket.length === 0) {
                console.log("basket empty - deleting order")
                this.getRoute(`/order/delete/22/${this.date}`);
            } else {

                for (let i=0; i < this.basket.length; i++) {
                    meal_ids.push(this.basket[i].id)
                }
                let post_data = {
                    "cobot_member_id": 22,
                    "order_date": this.date,
                    "meal_items": meal_ids
                }
                this.postRoute("/order/insert", post_data);
            }
            this.showModal = true;
            
        },
        returnTotalBasketAmount() {
            let total = 0;
            for (let i=0; i < this.basket.length; i++){
                total = total + this.basket[i].price;
            }
            return total;
        },
        async loadOrder(date) {
            console.log(date)
            this.basket = [];
            this.dateOrder = await this.getRoute(`/orderDetails/22/${date}`);

            if (this.dateOrder.length !== 0) {
                for (let i = 0; i < this.dateOrder.length; i++) { 
                    this.basket.push(this.dateOrder[i]);
                }
            }
            this.future_orders = await this.getRoute('/orders/22');    
        },
        formatDate(datetimeString) {
            return datetimeString.split('T')[0];
        },
        toggleDarkTheme() {
            this.isDarkTheme = !this.isDarkTheme;
            const body = document.querySelector('body');
            if (this.isDarkTheme) {
                body.classList.add('dark-theme');
            } else {
                body.classList.remove('dark-theme');
            }
        }
    }
}