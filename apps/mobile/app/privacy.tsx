import { InformationScreen } from "../src/features/information/InformationScreen";
import { privacySections } from "../src/features/information/information.data";

export default function PrivacyRoute() { return <InformationScreen description="How Amiyo-Go handles customer, seller, and marketplace information." eyebrow="PRIVACY RULES" sections={privacySections} title="Privacy Policy" updatedAt="June 7, 2026" />; }
