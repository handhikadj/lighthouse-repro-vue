import { createApp, provide, h } from "vue";
import App from "./App.vue";
import { provideApolloClient } from "@vue/apollo-composable";

import {
  ApolloClient,
  ApolloLink,
  concat,
  createHttpLink,
  InMemoryCache,
} from "@apollo/client/core";
import { createUploadLink } from "apollo-upload-client";
import { BatchHttpLink } from "@apollo/client/link/batch-http";
import Pusher from "pusher-js";
import Echo from "laravel-echo";

import { createLighthouseSubscriptionLink } from "@/utils/subscriptionLink.js";

const httpOptions = {
  uri: import.meta.env.VITE_GRAPHQL_URL,
};
const httpLink = ApolloLink.split(
  (operation) => operation.getContext().hasUpload,
  createUploadLink(httpOptions),
  new BatchHttpLink(httpOptions)
);

const cache = new InMemoryCache({
  addTypename: false,
});
const authMiddleware = new ApolloLink((operation, forward) => {
  // add the authorization to the headers
  const token = localStorage.getItem("token");
  operation.setContext({
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
  });
  return forward(operation);
});

const echoClient = new Echo({
  broadcaster: "pusher",
  key: "app-key",
  wsHost: "127.0.0.1",
  wsPort: 6001,
  wssPort: 6001,
  wsPath: null,
  disableStats: false,
  cluster: "eu",
  forceTLS: false,
  enabledTransports: ["ws", "wss", "flash"],
  authEndpoint:
    "http://" + import.meta.env.VITE_API_HOST + "/graphql/subscriptions/auth",
  auth: {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  },
});

const apolloClient = new ApolloClient({
  link: ApolloLink.from([
    authMiddleware,
    createLighthouseSubscriptionLink(echoClient),
    httpLink,
  ]),
  cache,
});

provideApolloClient(apolloClient);

const app = createApp({
  setup() {
    provide(apolloClient);
  },

  render: () => h(App),
});

app.mount("#app");
