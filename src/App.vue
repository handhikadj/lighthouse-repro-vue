<template>
  <div>This is App.vue</div>
</template>

<script setup>
import axios from "axios";
import { computed, watch, onMounted } from "vue";
import { gql } from "@apollo/client";
import { useQuery, useMutation, useSubscription } from "@vue/apollo-composable";

onMounted(async () => {
  const { data } = await axios.post(`${import.meta.env.VITE_API_URL}login`);

  localStorage.setItem("token", data.token);

  const appEventSubscription = gql`
    subscription appEvent($userId: ID!) {
      appEvent(userId: $userId) {
        type
      }
    }
  `;
  const startSubscription = () => {
    const { onResult, onError } = useSubscription(appEventSubscription, {
      userId: data.user.id,
    });
    onResult((data) => {
      console.error("onResult data in subscription: ", data);
    });
    onError((error) => {
      console.error("onError error in subscription: ", error);
    });
  };
  startSubscription();
});
</script>
