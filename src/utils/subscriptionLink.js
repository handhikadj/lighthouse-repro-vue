import { Observable, ApolloLink } from "@apollo/client/core";

// The presence channel interface does not have the channel methods,
// but in reality the actual object does, so I try to fix this here.

function subscribeToEcho(echoClient, channelName, observer) {
  const channel = echoClient.private(channelName.replace(/^private\-/, ""));

  channel.listen(".lighthouse-subscription", (result) =>
    observer.next(result.result)
  );
}

function unsubscribe(echoClient, getChannelName) {
  const channelName = getChannelName();
  if (channelName) {
    echoClient.leave(channelName);
  }
}

function createSubscriptionHandler(
  echoClient,
  operation,
  observer,
  setChannelName
) {
  return (data) => {
    const operationDefinition = operation.query.definitions.find(
      (definitionNode) => definitionNode.kind === "OperationDefinition"
    );

    const fieldNode = operationDefinition.selectionSet.selections.find(
      (definitionNode) => definitionNode.kind === "Field"
    );

    const subscriptionName = fieldNode.name.value;
    const lighthouseVersion =
      data?.extensions?.lighthouse_subscriptions?.version;
    const channelName =
      lighthouseVersion == 2
        ? data?.extensions?.lighthouse_subscriptions?.channel
        : data?.extensions?.lighthouse_subscriptions?.channels?.[
            subscriptionName
          ];

    if (channelName) {
      setChannelName(channelName);
      subscribeToEcho(echoClient, channelName, observer);
    } else {
      observer.next(data);
      observer.complete();
    }
  };
}

function createRequestHandler(echoClient) {
  return (operation, forward) => {
    let channelName;
    return new Observable((observer) => {
      forward(operation).subscribe(
        createSubscriptionHandler(
          echoClient,
          operation,
          observer,
          (name) => (channelName = name)
        ),
        (error) => observer.error(error)
      );

      return () => unsubscribe(echoClient, () => channelName);
    });
  };
}

export const createLighthouseSubscriptionLink = (echoClient) => {
  return new ApolloLink(createRequestHandler(echoClient));
};

// module.exports = {
//   createLighthouseSubscriptionLink,
// };
