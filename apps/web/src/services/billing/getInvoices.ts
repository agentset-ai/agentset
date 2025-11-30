/**
 * Get invoices
 *
 * Returns all invoices for an organization.
 */

import { stripe } from "@agentset/stripe";

import type { ProtectedAgentsetContext } from "../shared/context";
import { verifyOrganizationAccess } from "../shared/organization-access";

export const getInvoices = async (
  context: ProtectedAgentsetContext,
  input: { orgId: string },
) => {
  const organization = await verifyOrganizationAccess(context, input.orgId);

  if (!organization.stripeId) {
    return [];
  }

  try {
    const invoices = await stripe.invoices.list({
      customer: organization.stripeId,
    });

    return invoices.data.map((invoice) => {
      return {
        id: invoice.id,
        total: invoice.amount_paid,
        createdAt: new Date(invoice.created * 1000),
        description: "Agentset subscription",
        pdfUrl: invoice.invoice_pdf,
      };
    });
  } catch (error) {
    console.log(error);
    return [];
  }
};
