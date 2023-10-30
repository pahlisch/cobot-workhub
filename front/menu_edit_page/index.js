function menuEditor() {
    return {
        route: "https://cobot-bot-workhub-b4b7ac000c0c.herokuapp.com",
        items: [],
        currentItem: {},    
        api_token: 'YOUR_API_TOKEN',
        async fetchItems() {
            try {
                const response = await fetch(this.route + '/meals', {
                    method: 'GET',
                    headers: {
                        'Authorization': 'Bearer ' + this.api_token
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                this.items = await response.json();
            } catch (error) {
                console.error('Error fetching items:', error);
            }
        },

        startEditing(item) {
            this.currentItem = { ...item };
        },
        async saveItem() {
            // If the item has an ID, update, otherwise add.
            let endpoint = this.currentItem.id ? `/meal/update/${this.currentItem.id}` : '/meal/add';
            let method = this.currentItem.id ? 'PUT' : 'POST';

            await fetch(this.route + endpoint, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    "Authorization": "Bearer " + this.api_token
                },
                body: JSON.stringify(this.currentItem)
            });

            this.currentItem = {};
            await this.fetchItems();
        },
        async deleteItem(id) {
            await fetch(this.route + `/meal/delete/${id}`, {
                method: 'DELETE',
                headers: {"Authorization": "Bearer " + this.api_token}
            });
            await this.fetchItems();
        },
        async toggleDisplay(item) {
            item.display = !item.display;
            await fetch(this.route + `/meal/display/${item.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    "Authorization": "Bearer " + this.api_token
                },
                body: JSON.stringify({ display: item.display })
            });
        
            await this.fetchItems();
        },
        init() {
            this.fetchItems();
        }
    };
}