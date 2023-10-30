function app() {
    return {
        route: "https://cobot-bot-workhub-b4b7ac000c0c.herokuapp.com",
        cobot_route: "https://www.cobot.me/api",
        date: new Date().toJSON().slice(0, 10),
        items: [],
        showModal: false,
        modalMessage: '',
        basket: [],
        future_orders: [],
        cur: ' CHF',
        space_name: 'wiz-cobot',
        api_token: 'YOUR_API_TOKEN',
        async fetchItems() {
            this.member_id = await this.upsertUserId();
            this.items = await this.getRoute('/meals');
            this.future_orders = await this.getRoute(`/orders/${this.member_id}`);
            this.basket = await this.getRoute(`/orderDetails/${this.member_id}/${this.date}`);
        },
        async getRoute(endRoute) {
            try {
                const response = await fetch(this.route + endRoute, {
                    method: "GET",
                    headers: {
                      "Cache-Control": "no-cache",
                      "Authorization": "Bearer " + this.api_token,
                    },
                  });
                const data = await response.json();
                return data;
            } catch (error) {
                console.error("Error fetching data:", error);
                throw error;
            }
        },
        async getCobot(endRoute) {
            try {
                const response = await fetch(this.cobot_route + endRoute, 
                    {
                        method: "GET",
                        headers: {
                          "Authorization": "Bearer " + window.cobot.access_token
                        },
                    });
                const data = await response.json();
                return data;
            } catch (error) {
                console.error("Error fetching data:", error);
                throw error;
            }
        },
        async upsertUserId() {
            let data = await this.getCobot("/user");
            let userName = "name_not_found";
            let membershipId = "membership_not_found";
            try {
                for (let i=0; i<data.memberships.length; i++) {
                    if (data.memberships[i].space_name === this.space_name) {
                        userName = data.memberships[i].name;
                        membershipId = data.memberships[i].id;
                    }
                }
                
            } catch (error) {
                throw error;
            }

            this.postRoute("/user/upsert", {cobotId: data.id, userName: userName, membershipId: membershipId})
            return data.id
        }, 
        async postRoute(endRoute, postData) {
            try {
                const response = await fetch(this.route + endRoute, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + this.api_token,
                    },
                    body: JSON.stringify(postData)
                });
        
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                } 


            } catch (error) {
                console.error("Error posting data:", error);
                throw error;
            }
        },
        addToBasket(item) {
            this.basket.push(item);

        },
        removeFromBasket(index) {
            this.basket.splice(index, 1);
        },
        confirmBasket() {
            let currentDate = new Date();
            let basketDate = new Date(this.date);
            if (basketDate <= currentDate) {

                this.modalMessage = "Les comandes du jour ont déjà été transmises au restaurant, vous ne pouvez plus les modifier ou passer de nouvelles commandes"
                this.showModal = true;
                return
            }
            
            let meal_ids = [];
            
            if (this.basket.length === 0) {

                this.getRoute(`/order/delete/${this.member_id}/${this.date}`);
            } else {

                for (let i=0; i < this.basket.length; i++) {
                    meal_ids.push(this.basket[i].id)
                }
                let post_data = {
                    "cobot_member_id": this.member_id,
                    "order_date": this.date,
                    "meal_items": meal_ids
                }
                this.postRoute("/order/insert", post_data);
            }
            this.modalMessage = "Votre commande a été enregistrée"
            this.showModal = true;
            
        },
        returnTotalBasketAmount() {
            let total = 0;
            for (let i=0; i < this.basket.length; i++){
                total = total + this.basket[i].price_meal_item;
            }
            return total;
        },
        async loadOrder(date) {

            this.basket = [];
            this.dateOrder = await this.getRoute(`/orderDetails/${this.member_id}/${date}`);

            if (this.dateOrder.length !== 0) {
                for (let i = 0; i < this.dateOrder.length; i++) { 
                    this.basket.push(this.dateOrder[i]);
                }
            }
            this.future_orders = await this.getRoute(`/orders/${this.member_id}`);    
        },
        formatDate(datetimeString) {
            return datetimeString.split('T')[0];
        },
        
    }
}