import { NextRequest, NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function POST(request: NextRequest) {
      const organization = await requireCurrentOrganization();
      const body = await request.json();

  const { itemId, firstName, lastName, email, phone, eventDate, deliveryAddress } = body;

  if (!itemId || !firstName || !lastName || !email || !eventDate || !deliveryAddress) {
          return NextResponse.json({ error: "Missing required booking details" }, { status: 400 });
  }

  const item = await prisma.item.findFirst({
          where: { id: itemId, organizationId: organization.id },
  });

  if (!item) {
          return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  let customer = await prisma.customer.findFirst({
          where: { organizationId: organization.id, email },
  });

  if (!customer) {
          customer = await prisma.customer.create({
                    data: {
                                organizationId: organization.id,
                                firstName,
                                lastName,
                                email,
                                phone: phone || null,
                                address: deliveryAddress,
                    },
          });
  }

  const orderNumber = `ORD-${Date.now()}`;

  const order = await prisma.order.create({
          data: {
                    organizationId: organization.id,
                    customerId: customer.id,
                    orderNumber,
                    eventDate: new Date(eventDate),
                    deliveryAddress,
                    status: "pending",
                    source: "online",
                    subtotal: item.cost,
                    totalAmount: item.cost,
                    items: {
                                create: [
                                    {
                                                    itemId: item.id,
                                                    quantity: 1,
                                                    price: item.cost,
                                    },
                                            ],
                    },
          },
  });

  const session = await stripe.checkout.sessions.create({
          mode: "payment",
          payment_method_types: ["card"],
          customer_email: email,
          line_items: [
              {
                          price_data: {
                                        currency: "usd",
                                        product_data: { name: item.name },
                                        unit_amount: Math.round(item.cost * 100),
                          },
                          quantity: 1,
              },
                  ],
          success_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?orderId=${order.id}`,
          cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout?itemId=${item.id}`,
          metadata: {
                    orderId: order.id,
                    organizationId: organization.id,
          },
  });

  await prisma.order.update({
          where: { id: order.id },
          data: { stripeSessionId: session.id },
  });

  return NextResponse.json({ url: session.url });
}
