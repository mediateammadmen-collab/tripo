import LegalPage, { ContactLine } from "@/components/LegalPage";
import { site } from "@/lib/tripo/config";

export const metadata = {
  title: "Privacy Policy",
  description: "How Tripo handles your information.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="5 October 2026">
      <p>
        Tripo is run by {site.operator}. This page explains what information Tripo uses, where it goes, and the
        choices you have.
      </p>

      <h2>Information stored on your device</h2>
      <p>
        Your travel profile (the answers you give when you sign up), your saved places, flights, hotels and trips,
        and the friends you add are stored <b>in your browser on your own device</b>. We do not keep a copy on our
        servers, and there are no passwords or user accounts at the moment. Clearing your browser&apos;s site data
        for Tripo deletes this information, and it will not appear on your other devices.
      </p>

      <h2>Chat messages and AI</h2>
      <p>
        When you chat with Tripo, your message, recent conversation and your travel profile are sent through our
        server to Google&apos;s Gemini AI service so it can write an answer. We do not store your conversations on
        our server. Google processes this data under the{" "}
        <a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noopener noreferrer">
          Gemini API Additional Terms of Service
        </a>
        . While Tripo uses Google&apos;s free tier, Google may use these messages to improve its products, and
        people at Google may review them. Please don&apos;t share passwords, ID or passport numbers, payment details
        or health information in the chat.
      </p>

      <h2>Voice</h2>
      <p>
        Voice mode uses your browser&apos;s built-in speech features. Some browsers, such as Google Chrome, send
        your voice to the browser maker&apos;s servers to turn it into text. Tripo itself does not record or store
        audio. You can always type instead.
      </p>

      <h2>Booking links</h2>
      <p>
        Flight and hotel buttons open Trip.com and Booking.com. Anything you do there is covered by their own
        privacy policies. These links may include our affiliate ID, which lets those sites know you came from
        Tripo; we may earn a commission at no extra cost to you. We don&apos;t receive your booking or payment
        details.
      </p>

      <h2>Talking to a person</h2>
      <p>
        If you contact us on WhatsApp, WhatsApp&apos;s privacy policy applies to that conversation, and we use what
        you send only to help you with your trip.
      </p>

      <h2>Technical data</h2>
      <p>
        Like most websites, our hosting provider automatically processes basic technical data such as your IP
        address and browser type to deliver the site and protect it from abuse. We use your IP address briefly to
        limit how many AI requests can be made per minute. Tripo does not use advertising cookies or tracking
        pixels.
      </p>

      <h2>Children</h2>
      <p>Tripo is not meant for children under 13, and we don&apos;t knowingly collect information from them.</p>

      <h2>Changes</h2>
      <p>
        If we change how Tripo handles information, for example by adding accounts, we will update this page and
        the date at the top.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about privacy? <ContactLine />.
      </p>
    </LegalPage>
  );
}
