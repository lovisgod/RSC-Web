import { Button } from "@rsc/ui";
import { useState } from "react";

export function PromotionsPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [segment, setSegment] = useState("all");
  const [schedule, setSchedule] = useState("immediate");

  function handleClear() {
    setTitle("");
    setBody("");
    setSegment("all");
    setSchedule("immediate");
  }

  return (
    <div className="promo-wrap">
      <div className="panel promo-panel">
        <h2 className="promo-panel__title">Compose Platform Promotion Push Campaign</h2>

        <div className="promo-form">
          <label className="field-label">
            Campaign Title
            <input
              className="field-input"
              type="text"
              placeholder="e.g. Happy Friday! 🍟"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>

          <label className="field-label">
            Push Message Body
            <textarea
              className="field-input field-input--textarea"
              placeholder="Get 20% off all grills at Cactus. Order now!"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>

          <label className="field-label">
            Target Segment
            <select
              className="field-input"
              value={segment}
              onChange={(e) => setSegment(e.target.value)}
            >
              <option value="all">All Customers</option>
              <option value="new">New Customers</option>
              <option value="returning">Returning Customers</option>
              <option value="inactive">Inactive (30+ days)</option>
            </select>
          </label>

          <label className="field-label">
            Schedule Campaign
            <select
              className="field-input"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
            >
              <option value="immediate">Send Immediately 🚀</option>
              <option value="scheduled">Schedule for Later</option>
            </select>
          </label>

          <div className="promo-actions">
            <Button tone="quiet" onClick={handleClear}>
              Clear Form
            </Button>
            <Button tone="navy">Broadcast Campaign</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
