// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
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
    const submit = screen.getByRole("button", { name: /subscribe/i }) as HTMLButtonElement;
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

    const submit = screen.getByRole("button", { name: /subscribe/i }) as HTMLButtonElement;
    expect(submit.disabled).toBe(false);

    await user.click(submit);

    expect(await screen.findByText(/you're in/i)).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const sent = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(sent.phone_e164).toBe("+14158675309");
    expect(sent.consent_text_snapshot).toBe(consentSnapshot(props));
  });

  it("shows an error overlay when the server rejects the submission", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: false, message: "Nope" }), {
          status: 422,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    render(<SubscriptionForm {...props} />);
    await user.type(screen.getByLabelText("First name"), "Jane");
    await user.type(screen.getByLabelText("Last name"), "Doe");
    await user.type(screen.getByLabelText("Phone number"), "4158675309");
    const boxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
    fireEvent.click(boxes[0]);
    fireEvent.click(boxes[1]);
    await user.click(screen.getByRole("button", { name: /subscribe/i }));
    expect(await screen.findByText(/something went wrong/i)).toBeTruthy();
  });

  // Shared helper: fill the form to a submittable state, then submit.
  async function fillAndSubmit() {
    fireEvent.change(screen.getByLabelText("First name"), {
      target: { value: "Jane" },
    });
    fireEvent.change(screen.getByLabelText("Last name"), {
      target: { value: "Doe" },
    });
    fireEvent.change(screen.getByLabelText("Phone number"), {
      target: { value: "4158675309" },
    });
    const boxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
    fireEvent.click(boxes[0]);
    fireEvent.click(boxes[1]);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /subscribe/i }));
    });
    await act(async () => {}); // drain the fetch promise chain -> result state
  }

  it("error overlay fades out and restores the entered data", async () => {
    vi.useFakeTimers();
    try {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(JSON.stringify({ success: false, message: "x" }), {
            status: 422,
            headers: { "content-type": "application/json" },
          }),
        ),
      );
      render(<SubscriptionForm {...props} />);
      await fillAndSubmit();
      expect(screen.getByText(/something went wrong/i)).toBeTruthy();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(3600); // past the ~3s error hold + fade
      });

      // Overlay gone; entered data preserved so the user can retry.
      expect(screen.queryByText(/something went wrong/i)).toBeNull();
      expect(
        (screen.getByLabelText("First name") as HTMLInputElement).value,
      ).toBe("Jane");
      expect(
        (screen.getByLabelText("Phone number") as HTMLInputElement).value,
      ).toBe("4158675309");
    } finally {
      vi.useRealTimers();
    }
  });

  it("success overlay stays (does not auto-dismiss)", async () => {
    vi.useFakeTimers();
    try {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
        ),
      );
      render(<SubscriptionForm {...props} />);
      await fillAndSubmit();
      expect(screen.getByText(/you're in/i)).toBeTruthy();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });

      // Terminal: success remains after well past the error-dismiss window.
      expect(screen.getByText(/you're in/i)).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });
});
