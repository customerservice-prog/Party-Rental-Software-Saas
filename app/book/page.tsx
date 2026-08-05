import Link from "next/link";
import { requireCurrentOrganization } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import StorefrontNav from "../StorefrontNav";

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function BookPage() {
  const organization = await requireCurrentOrganization();

  const [items, businessHours] = await Promise.all([
    prisma.item.findMany({
      where: { organizationId: organization.id, displayToCustomer: true },
      orderBy: { name: "asc" },
    }),
    organization.showHoursOnSite
      ? prisma.businessHours.findMany({
          where: { organizationId: organization.id },
          orderBy: { dayOfWeek: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const accent = organization.primaryColor || "#4f46e5";

  return (
    <div className="min-h-screen bg-gray-50">
      <StorefrontNav organizationId={organization.id} activeSlug="book" />
      <header
        className="text-white"
        style={{ backgroundColor: accent }}
      >
        <div className="max-w-6xl mx-auto px-8 py-4 flex items-center gap-3">
          {organization.logoUrl ? (
            <img
              src={organization.logoUrl}
              alt={organization.name}
              className="h-10 w-10 rounded object-cover bg-white/20"
            />
          ) : (
            <div className="h-10 w-10 rounded bg-white/20 flex items-center justify-center font-bold">
              {organization.name.charAt(0)}
            </div>
          )}
          <span className="font-semibold text-lg">{organization.name}</span>
          <nav className="ml-auto flex items-center gap-4 text-sm">
            {organization.facebookUrl && (
              <a href={organization.facebookUrl} target="_blank" rel="noreferrer" className="hover:underline">
                Facebook
              </a>
            )}
            {organization.instagramUrl && (
              <a href={organization.instagramUrl} target="_blank" rel="noreferrer" className="hover:underline">
                Instagram
              </a>
            )}
            {organization.contactPhone && (
              <a href={"tel:" + organization.contactPhone} className="hover:underline">
                {organization.contactPhone}
              </a>
            )}
          </nav>
        </div>
      </header>

      <section
        className="relative"
        style={{
          backgroundColor: accent,
          backgroundImage: organization.heroImageUrl
            ? "linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url(" + organization.heroImageUrl + ")"
            : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="max-w-6xl mx-auto px-8 py-16 text-white">
          <h1 className="text-4xl font-bold mb-3">{organization.name}</h1>
          <p className="text-lg text-white/90 max-w-2xl">
            {organization.tagline ||
              "Pick the items you would like to rent and request a booking online."}
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto p-8">
        {organization.aboutText && (
          <div className="bg-white rounded-lg shadow p-6 mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">About Us</h2>
            <p className="text-gray-600 whitespace-pre-line">{organization.aboutText}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Browse Rentals</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {items.length === 0 && (
                <p className="text-gray-500 col-span-full">
                  No rental items are available yet. Please check back soon.
                </p>
              )}
              {items.map((item) => (
                <div key={item.id} className="bg-white rounded-lg shadow overflow-hidden flex flex-col">
                  <div className="h-40 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                    {item.picture ? (
                      <img src={item.picture} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      "No image"
                    )}
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="font-semibold text-gray-900">{item.name}</h3>
                    <p className="text-sm text-gray-500 mt-1 flex-1">{item.description}</p>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="font-bold" style={{ color: accent }}>
                        ${item.cost.toFixed(2)}
                      </span>
                      <Link
                        href={"/checkout?itemId=" + item.id}
                        className="text-white text-sm px-3 py-1.5 rounded-md"
                        style={{ backgroundColor: accent }}
                      >
                        Book Now
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-1 space-y-6">
            {organization.showHoursOnSite && businessHours.length > 0 && (
              <div className="bg-white rounded-lg shadow p-5">
                <h3 className="font-semibold text-gray-900 mb-3">Business Hours</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  {businessHours.map((h) => (
                    <li key={h.dayOfWeek} className="flex justify-between">
                      <span>{DAY_LABELS[h.dayOfWeek]}</span>
                      <span>{h.isClosed ? "Closed" : (h.openTime || "") + " - " + (h.closeTime || "")}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(organization.address || organization.contactEmail || organization.contactPhone) && (
              <div className="bg-white rounded-lg shadow p-5">
                <h3 className="font-semibold text-gray-900 mb-3">Contact</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  {organization.address && (
                    <li>
                      {organization.address}
                      {organization.city ? ", " + organization.city : ""}
                      {organization.state ? ", " + organization.state : ""} {organization.zip || ""}
                    </li>
                  )}
                  {organization.contactPhone && <li>{organization.contactPhone}</li>}
                  {organization.contactEmail && <li>{organization.contactEmail}</li>}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
