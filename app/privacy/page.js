import LegalPage, { ContactLine } from "@/components/LegalPage";
import { site } from "@/lib/tripo/config";

export const metadata = {
  title: "Privacy Policy",
  description: "How Tripo handles your information.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="15 October 2026">
      <p>
        Tripo is run by {site.operator}. This page explains what information Tripo uses, where it goes, and the
        choices you have.
      </p>

      <h2>Using Tripo without an account</h2>
      <p>
        You can use Tripo as a guest. Your travel profile, saved places, trips and conversations are then stored{" "}
        <b>only in your browser on your own device</b>. We do not keep a copy. Clearing your browser&apos;s site
        data for Tripo deletes them, and they will not appear on your other devices.
      </p>

      <h2>If you create an account</h2>
      <p>
        To create an account we ask for an email address and a password. Your password is stored in protected
        (hashed) form by our database provider, Supabase; we never see it. When you are signed in, your travel
        profile, saved places, trips (including any booking details you add) and conversations with Tripo are stored
        in your account so they follow you across devices. Only you can read them, plus the people you choose to
        share a trip with.
      </p>
      <p>
        To delete your account and everything in it, <ContactLine /> from the email address you signed up with.
      </p>

      <h2>Sharing a trip</h2>
      <p>
        Trips are private unless you switch on sharing. A shared trip can be opened by anyone who has its link; it
        shows the trip&apos;s name, dates, days, places and notes, but never your email address or your uploaded
        booking details. If you choose &quot;plan together&quot;, signed-in people with the link can join and edit
        the trip, and you can see the names of those who joined. You can switch sharing off at any time, which stops
        the link from working.
      </p>

      <h2>Chat messages and AI</h2>
      <p>
        When you chat with Tripo, your message, recent conversation and your travel profile are sent through our
        server to an AI service so it can write an answer: OpenAI, or Google&apos;s Gemini as a backup when OpenAI
        is busy. Our server does not keep a copy; the conversation is saved in your browser, and in your account if
        you are signed in. OpenAI processes this data under its{" "}
        <a href="https://openai.com/policies/business-terms/" target="_blank" rel="noopener noreferrer">business terms</a>{" "}
        and does not use it to train its models by default. Google processes backup requests under the{" "}
        <a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noopener noreferrer">
          Gemini API Additional Terms of Service
        </a>
        ; on Google&apos;s free tier those messages may be used to improve Google&apos;s products and reviewed by
        people. Please don&apos;t share passwords, ID or passport numbers, payment details or health information in
        the chat.
      </p>

      <h2>Tickets and receipts you upload</h2>
      <p>
        When you upload a photo or PDF of a booking, it is sent through our server to the AI service (OpenAI, or
        Google Gemini as a backup), which reads out details such as the booking reference, dates and price. The file itself is not
        stored by Tripo; only the details that were read are saved with your trip. Please don&apos;t upload
        documents that show passport numbers or full card numbers.
      </p>

      <h2>Maps and place information</h2>
      <p>
        Map images come from OpenFreeMap (built on OpenStreetMap data) and are loaded directly by your browser. To
        show where a place is, with a photo and short description, our server asks Wikipedia and OpenStreetMap
        search services about the place name; these requests do not include your identity. Weather comes from
        Open-Meteo. If you tap &quot;near me&quot; in Explore, your browser asks your permission first, and your
        approximate location is used once to find the nearest city. It is not stored.
      </p>

      <h2>Voice</h2>
      <p>
        Live voice only starts when you tap the voice button, and your browser asks for permission to use the
        microphone first. While a voice conversation is open, your voice is streamed directly to OpenAI&apos;s
        realtime service so Tripo can hear and answer you, and what you and Tripo say is written into your chat.
        Tripo does not record or store the audio. A voice conversation ends when you tap End, after two quiet
        minutes, or after 15 minutes. If live voice isn&apos;t available, Tripo uses your browser&apos;s own speech
        features instead; some browsers, such as Google Chrome, send that audio to the browser maker to turn it
        into text. You can always type instead.
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
