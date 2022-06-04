import { useParams } from "react-router-dom";
import React, { useCallback, useEffect, useState } from "react";
import { api, FlowData, FullFlow } from "../api";
import { Buffer } from "buffer";

import {
  ArrowCircleLeftIcon,
  ArrowCircleRightIcon,
} from "@heroicons/react/solid";
import { format } from "date-fns";
import classNames from "classnames";

import { hexy } from "hexy";
import { useCopy } from "../hooks/useCopy";

function CopyButton({ copyText }: { copyText?: string }) {
  const { statusText, copy, copyState } = useCopy({
    getText: async () => copyText ?? "",
  });
  return (
    <>
      {copyText && (
        <button
          className="p-2 text-sm text-blue-500"
          onClick={copy}
          disabled={!copyText}
        >
          {statusText}
        </button>
      )}
    </>
  );
}

function FlowContainer({
  copyText,
  children,
}: {
  copyText?: string;
  children: React.ReactNode;
}) {
  return (
    <div className=" pb-5 flex flex-col">
      <div className="ml-auto">
        <CopyButton copyText={copyText}></CopyButton>
      </div>
      <pre className="p-5 overflow-auto">{children}</pre>
    </div>
  );
}

function HexFlow({ flow }: { flow: FlowData }) {
  const data = flow.hex;
  // make hex view here, use Buffer or maybe not.
  const buffer = Buffer.from(data, "hex");
  const hex = hexy(buffer);
  return <FlowContainer copyText={hex}>{hex}</FlowContainer>;
}

function TextFlow({ flow }: { flow: FlowData }) {
  return <FlowContainer copyText={flow.data}>{flow.data}</FlowContainer>;
}

function WebFlow({ flow }: { flow: FlowData }) {
  const data = flow.data;
  const [header, ...rest] = data.split("\r\n\r\n");
  const http_content = rest.join("\r\n\r\n");

  const Hack = "iframe" as any;
  return (
    <FlowContainer>
      <pre>{header}</pre>
      <div className="border border-gray-200 rounded-lg">
        <Hack
          srcDoc={http_content}
          sandbox=""
          height={300}
          csp="default-src none" // there is a warning here but it actually works, not supported in firefox though :(
        ></Hack>
      </div>
    </FlowContainer>
  );
}

function PythonRequestFlow({ flow }: { flow: FlowData }) {
  const [data, setData] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const data = await api.toPythonRequest(btoa(flow.data), true);
      setData(data);
    };
    // TODO proper error handling
    fetchData().catch((err) => setData(err));
  }, [flow.data]);

  return <FlowContainer copyText={data}>{data}</FlowContainer>;
}

interface FlowProps {
  flow: FlowData;
  delta_time: number;
}

interface RadioGroupProps {
  options: string[];
  value: string;
  onChange: (option: string) => void;
}

function RadioGroup(props: RadioGroupProps) {
  return (
    <div className="flex gap-2 text-gray-800 text-sm ml-auto mr-4">
      {props.options.map((option) => (
        <div
          key={option}
          onClick={() => props.onChange(option)}
          className={classNames({
            "bg-gray-200": option === props.value,
            "px-1 rounded-sm": true,
          })}
        >
          {option}
        </div>
      ))}
    </div>
  );
}

function detectType(flow: FlowData) {
  const firstLine = flow.data.split("\n")[0];
  if (firstLine.includes("HTTP")) {
    return "Plain";
  }

  return "Plain";
}

function Flow({ flow, delta_time }: FlowProps) {
  const formatted_time = format(new Date(flow.time), "HH:mm:ss:SSS");
  const displayOptions = ["Plain", "Hex", "Web", "PythonRequest"];

  // Basic type detection, currently unused
  const [displayOption, setDisplayOption] = useState(detectType(flow));

  return (
    <div className=" text-mono">
      <div
        className="sticky shadow-md bg-white overflow-auto py-1 border-y"
        style={{ top: 50 }}
      >
        <div className="flex items-center h-6">
          <div className="w-8 px-2">
            {flow.from === "s" ? (
              <ArrowCircleLeftIcon className="fill-green-700" />
            ) : (
              <ArrowCircleRightIcon className="fill-red-700" />
            )}
          </div>
          <div style={{ width: 200 }}>
            {formatted_time}
            <span className="text-gray-400 pl-3">{delta_time}ms</span>
          </div>
          <RadioGroup
            options={displayOptions}
            value={displayOption}
            onChange={setDisplayOption}
          />
        </div>
      </div>
      <div
        className={
          flow.from === "s"
            ? "border-l-8 border-green-300"
            : "border-l-8 border-red-300"
        }
      >
        {displayOption === "Hex" && <HexFlow flow={flow}></HexFlow>}
        {displayOption === "Plain" && <TextFlow flow={flow}></TextFlow>}
        {displayOption === "Web" && <WebFlow flow={flow}></WebFlow>}
        {displayOption === "PythonRequest" && (
          <PythonRequestFlow flow={flow}></PythonRequestFlow>
        )}
      </div>
    </div>
  );
}

function FlowOverview({ flow }: { flow: FullFlow }) {
  return (
    <div>
      {flow.signatures?.length > 0 ? (
        <div className="bg-blue-200">
          <div className="font-extrabold">Suricata</div>
          <div className="pl-2">
            {flow.signatures.map((sig) => {
              return (
                <div className="py-1">
                  <div className="flex">
                    <div>Message: </div>
                    <div className="font-bold">{sig.msg}</div>
                  </div>
                  <div className="flex">
                    <div>Rule ID: </div>
                    <div className="font-bold">{sig.id}</div>
                  </div>
                  <div className="flex">
                    <div>Action taken: </div>
                    <div
                      className={
                        sig.action === "blocked"
                          ? "font-bold text-red-800"
                          : "font-bold text-green-800"
                      }
                    >
                      {sig.action}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : undefined}
      <div className="bg-yellow-200">
        <div className="font-extrabold">Meta</div>
        <div className="pl-2">
          <div>Source: </div>
          <div className="font-bold">{flow.filename}</div>
          <div></div>
          <div>Tags: </div>
          <div className="font-bold">[{flow.tags.join(", ")}]</div>
          <div></div>
        </div>
      </div>
    </div>
  );
}

function Header() {}

export function FlowView() {
  const params = useParams();
  const [flow, setFlow] = useState<FullFlow>();

  const id = params.id;

  useEffect(() => {
    const fetchData = async () => {
      if (id === undefined) {
        return;
      }
      const data = await api.getFlow(id);
      setFlow(data);
    };
    fetchData().catch(console.error);
  }, [id]);

  console.log(flow);

  async function copyAsPwn() {
    if (flow?._id.$oid) {
      let content = await api.toPwnTools(flow?._id.$oid);
      return content;
    }
    return "";
  }

  const { statusText, copy, copyState } = useCopy({
    getText: copyAsPwn,
    copyStateToText: {
      copied: "Copied",
      default: "Copy as pwntools",
      failed: "Failed",
      copying: "Generating payload",
    },
  });

  return (
    <div>
      <div
        className="sticky shadow-md top-0 bg-white overflow-auto border-b border-b-gray-200 flex"
        style={{ height: 60, zIndex: 100 }}
      >
        <div className="flex  align-middle p-2 gap-3 ml-auto">
          <button
            className="bg-gray-700 text-white p-2 text-sm rounded-md"
            onClick={copy}
          >
            {statusText}
          </button>
          <button className="bg-gray-700 text-white p-2 text-sm rounded-md">
            Todo more things here?
          </button>
        </div>
      </div>
      {flow ? <FlowOverview flow={flow}></FlowOverview> : undefined}
      {flow?.flow.map((flow_data, i, a) => {
        const delta_time = a[i].time - (a[i - 1]?.time ?? a[i].time);
        return (
          <Flow
            flow={flow_data}
            delta_time={delta_time}
            key={flow._id.$oid + " " + i}
          ></Flow>
        );
      })}
    </div>
  );
}
