import React, { FC, useContext } from "react";
import { URLSearchParamsInit, useSearchParams } from "react-router-dom";
import styled from "styled-components";
import { TransactionState } from "../../../../../libs/service/transfer/tonService";
import { AddressTransfer } from "../../../../components/Address";
import { CodeBlock } from "../../../../components/CodeBlock";
import {
  Body,
  ButtonPositive,
  ButtonRow,
  ErrorMessage,
  Gap,
  TextLine,
} from "../../../../components/Components";
import { Dots } from "../../../../components/Dots";
import { Fees } from "../../../../components/send/Fees";
import {
  SendCancelButton,
  SendEditButton,
} from "../../../../components/send/SendButtons";
import { WalletStateContext } from "../../../../context";
import { FingerprintLabel } from "../../../../FingerprintLabel";
import { fiatFees } from "../../../../utils";
import { useTransactionAnalytics } from "../../../Analytics";
import {
  toState,
  useEstimateTransaction,
  useSendTransaction,
  useTargetAddress,
} from "./api";

const EditButton = React.memo(() => {
  const [searchParams, setSearchParams] = useSearchParams();
  const onEdit = () => {
    const state = toState(searchParams);
    setSearchParams({
      ...state,
      isEncrypt: state.isEncrypt ? "1" : "",
      isArbitraryData: state.isArbitraryData ? "true" : "",
    } as URLSearchParamsInit); // Remove submit flag from params
  };
  return <SendEditButton onEdit={onEdit} />;
});

const Fiat = styled.span`
  color: ${(props) => props.theme.darkGray};
`;

interface ConfirmProps {
  state: TransactionState;
  price?: number;
  balance?: string;
  onSend: (seqNo: number) => void;
}

export const ConfirmView: FC<ConfirmProps> = ({ state, price, onSend }) => {
  const {
    data: address,
    error: addressError,
    isFetching: isAddressFetching,
  } = useTargetAddress(state.address);
  const { data } = useEstimateTransaction(state, address);
  const {
    mutateAsync,
    error: sendError,
    isLoading: isSending,
  } = useSendTransaction();
  const track = useTransactionAnalytics();

  const onConfirm = async () => {
    if (!address) return;
    track(state);
    const seqNo = await mutateAsync({ address, state });
    onSend(seqNo);
  };

  const inFiat = price
    ? ` (USD ${fiatFees.format(parseFloat(state.amount) * price)}$)`
    : "";

  const isLoading = isAddressFetching || isSending;
  const disabled = isLoading || addressError != null;

  const wallet = useContext(WalletStateContext);
  
  const prettifyHexadecimal = (raw: string) => {
    const regex = /[0-9A-Fa-f]{6}/g;
    if(!regex.test(raw)) {
      throw new Error("Invalid hexadecimal string in the \"Arbitrary Data\" field");
    } else {
      let result = "";
      for (let i = 0; i < raw.length; i+=4){
        result = result + " " + raw.slice(i, i+4);
      }
      return result;
    }
  };

  return (
    <>
      <EditButton />
      <Body>
        <AddressTransfer left={wallet.name} right={state.address} />
        <TextLine>SENDING:</TextLine>
        <TextLine>
          <b>{state.amount} TON</b> <Fiat>{inFiat}</Fiat>
        </TextLine>

        <Fees estimation={data} />

        {!state.isArbitraryData && state.data && (
          <CodeBlock
            label={state.isEncrypt ? "E2E Encrypted Message" : "Public Message"}
          >
            {String(state.data)}
          </CodeBlock>
        )}

        {state.isArbitraryData && state.data && (
          <CodeBlock label="Arbitrary Data">
            {prettifyHexadecimal(String(state.data).replace("0x", ""))}
          </CodeBlock>
        )}

        {addressError && <ErrorMessage>{addressError.message}</ErrorMessage>}
        {sendError && <ErrorMessage>{sendError.message}</ErrorMessage>}

        <Gap />

        <ButtonRow>
          <SendCancelButton disabled={isLoading} />
          <ButtonPositive disabled={disabled} onClick={onConfirm}>
            {isLoading ? (
              <Dots>Loading</Dots>
            ) : (
              <FingerprintLabel>Confirm</FingerprintLabel>
            )}
          </ButtonPositive>
        </ButtonRow>
      </Body>
    </>
  );
};
