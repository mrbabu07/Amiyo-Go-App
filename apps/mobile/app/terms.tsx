import { InformationScreen } from "../src/features/information/InformationScreen";
import { termsSections } from "../src/features/information/information.data";

export default function TermsRoute() { return <InformationScreen description="The core rules for using Amiyo-Go as a customer, seller, or platform operator." eyebrow="LEGAL RULES" sections={termsSections} title="Terms and Conditions" updatedAt="June 7, 2026" />; }
