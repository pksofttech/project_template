self.addEventListener("push", function (event) {
    const data = event.data ? event.data.json() : {};

    const title = data.title || "📢 New Notification";
    const options = {
        body: data.body || "You have a new message!",
        icon: "/static/data_base/image/app_configurations/app_configurations_image.jpg",
        badge: "/static/data_base/image/app_configurations/app_configurations_image.jpg",
        data: data.url || "",
        vibrate: [100, 50, 100],
        // actions: [
        //     {
        //         action: "open_url",
        //         title: "View",
        //         icon: "/static/icons/icon-192x192.png",
        //     },
        // ],
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
    event.notification.close();

    const urlToOpen = event.notification.data || "/";
    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
            for (const client of clientList) {
                if (client.url === urlToOpen && "focus" in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
