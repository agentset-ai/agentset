import { stripe } from "./instance";

export async function cancelSubscription(customer?: string) {
  if (!customer) return;

  try {
    const subscriptionId = await stripe.subscriptions
      .list({
        customer,
      })
      .then((res) => res.data[0]?.id);

    if (subscriptionId) {
      return await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
        cancellation_details: {
          comment: "Customer deleted their Agentset organization.",
        },
      });
    }
  } catch (error) {
    console.log("Error cancelling Stripe subscription", error);
    return;
  }
}
