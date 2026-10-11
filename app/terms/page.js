import LegalPage, { ContactLine } from "@/components/LegalPage";
import { site } from "@/lib/tripo/config";

export const metadata = {
  title: "Terms of Use",
  description: "The terms for using Tripo.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use" updated="11 October 2026">
      <p>
        These terms apply when you use Tripo, a travel planning website run by {site.operator}. By using Tripo you
        agree to them. If you don&apos;t agree, please don&apos;t use the service.
      </p>

      <h2>What Tripo is</h2>
      <p>
        Tripo is a free planning assistant. It suggests destinations, itineraries, flights and places to stay, and
        links you to Trip.com and Booking.com to check live prices and book. Tripo is not a travel agency, airline
        or hotel, and it does not sell tickets or take payments.
      </p>

      <h2>AI suggestions can be wrong</h2>
      <p>
        Tripo&apos;s answers, city guides and the details it reads from uploaded bookings are produced by AI. They
        can be out of date, incomplete or simply wrong, including flight routes and times, hotel names, opening
        hours, visa rules, safety advice and where a place is shown on the map. Always check important
        details with the airline, hotel, booking site or official government sources before you travel or pay for
        anything.
      </p>

      <h2>Bookings are with other companies</h2>
      <p>
        When you book through a link from Tripo, your booking is a contract between you and that company (for
        example Trip.com, Booking.com, the airline or the hotel). Their terms, prices, cancellation and refund rules
        apply. We are not responsible for their services. Some links include our affiliate ID, and we may earn a
        commission at no extra cost to you.
      </p>

      <h2>Help from a person</h2>
      <p>
        Advice from our team is given in good faith to help you plan, but you remain responsible for your travel
        decisions, documents and bookings.
      </p>

      <h2>Fair use</h2>
      <p>
        Please don&apos;t misuse Tripo: no attempts to break or overload the service, scrape it, get around usage
        limits, or use it to create harmful, illegal or misleading content. We may limit or block access to protect
        the service.
      </p>

      <h2>Your data</h2>
      <p>
        As a guest, your profile and trips are stored in your own browser; with an account they are stored in your
        account. See our <a href="/privacy">Privacy Policy</a> for details. Keep your password private, and keep a
        copy of anything important, for example using the download button in My plan. When you share a trip or plan
        it with others, you are responsible for what you put in it and who you give the link to.
      </p>

      <h2>No guarantees</h2>
      <p>
        Tripo is provided &quot;as is&quot;. We do our best to keep it working and useful, but we can&apos;t promise
        it will always be available, error-free or suitable for a particular purpose. To the extent the law allows,
        we are not liable for losses caused by relying on Tripo&apos;s suggestions or by services from other
        companies.
      </p>

      <h2>Changes</h2>
      <p>
        We may update Tripo and these terms. When we change the terms, we will update the date at the top. Using
        Tripo after a change means you accept the new terms.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms? <ContactLine />.
      </p>
    </LegalPage>
  );
}
