import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAppearance } from "../storefront/i18n";
import type { OfficialContact as Contact } from "../../shared/commerce";
import { requestQuote } from "./events";
export default function OfficialContact() {
  const { tr } = useAppearance();
  const [contact, setContact] = useState<Contact>({
    email: "support@1shotcam.com",
    phone: null,
    whatsapp: null,
  });
  useEffect(() => {
    let alive = true;
    void api<Contact>("/api/commerce/contact", undefined, { quiet: true })
      .then((v) => {
        if (alive) setContact(v);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return (
    <div className="official-contact">
      <button
        type="button"
        className="button subtle"
        onClick={() => requestQuote()}
      >
        {tr("طلب عرض سعر / تواصل معنا", "Request a quote / contact us")}
      </button>
      <a href={`mailto:${contact.email}`}>{contact.email}</a>
      {contact.phone && (
        <a dir="ltr" href={`tel:${contact.phone}`}>
          {contact.phone}
        </a>
      )}
      {contact.whatsapp && (
        <a
          href={`https://wa.me/${contact.whatsapp.slice(1)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {tr("واتساب المنشأة", "Business WhatsApp")}
        </a>
      )}
    </div>
  );
}
