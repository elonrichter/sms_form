// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SubscriptionForm from "./SubscriptionForm";
import { consentSnapshot } from "@/lib/disclosure";

const props = {
  brandName: "Richmond Balance",
  termsUrl: "https://richmondbalance.com/sms-terms",
  privacyUrl: "https://richmondbalance.com/privacy",
  defaultCountry: "US",
  captchaSiteKey: "",
};

afterEach(cleanup);

describe("SubscriptionForm — compliance & state (SPEC 01/02)", () => {
  it("renders both consent checkboxes UNCHECKED by default", () => {
    render(<SubscriptionForm {...props} />);
    const boxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
    expect(boxes).toHaveLength(2);
    expect(boxes.every((b) => b.checked === false)).toBe(true);
  });

  it("disables submit until the form is valid", () => {
    render(<SubscriptionForm {...props} />);
    const submit = screen.getByRole("button", { name: /sign me up/i }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
  });

  it("renders disclosure text that exactly equals the consent snapshot", () => {
    render(<SubscriptionForm {...props} />);
    const marketing = (screen.getAllByRole("checkbox")[1] as HTMLInputElement);
    const labelText = marketing.closest("label")?.textContent ?? "";
    expect(labelText).toBe(consentSnapshot(props));
  });

  it("renders Terms/Privacy links to the configured URLs (never '#')", () => {
    render(<SubscriptionForm {...props} />);
    const terms = screen.getAllByRole("link", { name: "Terms" })[0] as HTMLAnchorElement;
    expect(terms.getAttribute("href")).toBe(props.termsUrl);
  });

  it("enables submit and shows success after a valid submission", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, status: "opted_in" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<SubscriptionForm {...props} />);
    await user.type(screen.getByLabelText("First name"), "Jane");
    await user.type(screen.getByLabelText("Last name"), "Doe");
    await user.type(screen.getByLabelText("Phone number"), "4158675309");

    const boxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
    fireEvent.click(boxes[0]);
    fireEvent.click(boxes[1]);

    const submit = screen.getByRole("button", { name: /sign me up/i }) as HTMLButtonElement;
    expect(submit.disabled).toBe(false);

    await user.click(submit);

    expect(await screen.findByText(/you're in/i)).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const sent = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(sent.phone_e164).toBe("+14158675309");
    expect(sent.consent_text_snapshot).toBe(consentSnapshot(props));
  });
});
