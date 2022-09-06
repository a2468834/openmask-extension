import { FC, useContext, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import styled from "styled-components";
import {
  Permission,
  PermissionList,
} from "../../../../libs/entries/permission";
import { WalletState } from "../../../../libs/entries/wallet";
import {
  Body,
  ButtonBottomRow,
  ButtonNegative,
  ButtonPositive,
  Center,
  Gap,
  H1,
  Text,
} from "../../../components/Components";
import { DAppBadge } from "../../../components/DAppBadge";
import { AccountStateContext } from "../../../context";
import { sendBackground } from "../../../event";
import { toShortAddress } from "../../api";
import { useBalance } from "../../home/api";
import { useAddConnectionMutation } from "./api";

const Label = styled.label`
  display: flex;
  gap: ${(props) => props.theme.padding};
  margin: ${(props) => props.theme.padding};
  border-bottom: 1px solid ${(props) => props.theme.darkGray};
`;

const Column = styled.div`
  overflow: hidden;
  flex-grow: 1;
  padding: 5px;
`;

const Row = styled.div`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Balance = styled(Row)`
  color: ${(props) => props.theme.darkGray};
`;

const Scroll = styled.div`
  overflow: auto;
`;

const Wallet: FC<{
  wallet: WalletState;
  selected: boolean;
  onSelect: (value: boolean) => void;
}> = ({ wallet, selected, onSelect }) => {
  const { data } = useBalance(wallet.address);

  return (
    <Label key={wallet.address}>
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onSelect(!selected)}
      />
      <Column>
        <Row>
          <b>{wallet.name}</b>
        </Row>
        <Row>{wallet.address}</Row>
        <Balance>{data ?? "-"} TON</Balance>
      </Column>
    </Label>
  );
};

export const ConnectDApp = () => {
  const [searchParams] = useSearchParams();
  const origin = decodeURIComponent(searchParams.get("origin") ?? "");
  const logo = decodeURIComponent(searchParams.get("logo") ?? "");

  const id = parseInt(searchParams.get("id") ?? "0", 10);

  const [permission, setPermission] = useState(false);

  useEffect(() => {
    if (!origin) {
      sendBackground.message("rejectRequest", id);
    }
  }, []);

  const account = useContext(AccountStateContext);

  const [selected, setSelected] = useState(
    account.wallets.map((w) => w.address)
  );

  const onCancel = () => {
    sendBackground.message("rejectRequest", id);
  };

  const onNext = () => {
    setPermission(true);
  };

  if (permission) {
    return (
      <ConfirmPermission
        origin={origin}
        addresses={selected}
        logo={logo}
        id={id}
        onBack={() => setPermission(false)}
      />
    );
  }

  return (
    <Body>
      <Center>
        <DAppBadge logo={logo} origin={origin} />
        <H1>Connect With OpenMask</H1>
        <Text>Select the account(s) to use on this site</Text>
      </Center>
      <Scroll>
        {account.wallets.map((wallet) => {
          return (
            <Wallet
              key={wallet.address}
              wallet={wallet}
              selected={selected.includes(wallet.address)}
              onSelect={(value) => {
                if (value) {
                  setSelected((items) => items.concat([wallet.address]));
                } else {
                  setSelected((items) =>
                    items.filter((item) => item !== wallet.address)
                  );
                }
              }}
            />
          );
        })}
      </Scroll>
      <Gap />
      <ButtonBottomRow>
        <ButtonNegative onClick={onCancel}>Cancel</ButtonNegative>
        <ButtonPositive onClick={onNext}>Next</ButtonPositive>
      </ButtonBottomRow>
    </Body>
  );
};

const toPermissionDescription = (permission: Permission) => {
  switch (permission) {
    case Permission.base:
      return "See address, account balance, activity and suggest transactions to approve";
    case Permission.switchNetwork:
      return "Allow to switch networks without notification pop-up";
  }
};

const PermissionView: FC<{
  permission: Permission;
  selected: boolean;
  onSelect: (value: boolean) => void;
  disabled: boolean;
}> = ({ permission, selected, onSelect, disabled }) => {
  return (
    <Label key={permission}>
      <input
        type="checkbox"
        checked={selected}
        disabled={disabled}
        onChange={() => onSelect(!selected)}
      />
      <Column>
        <div>{toPermissionDescription(permission)}</div>
      </Column>
    </Label>
  );
};

interface ConfirmProps {
  id: number;
  logo: string;
  origin: string;
  addresses: string[];
  onBack: () => void;
}

export const ConfirmPermission: FC<ConfirmProps> = ({
  id,
  logo,
  origin,
  addresses,
  onBack,
}) => {
  const { mutate, isLoading } = useAddConnectionMutation();

  const [permissions, setPermissions] = useState<Permission[]>([
    Permission.base,
  ]);

  const onConnect = () => {
    mutate({ id, origin: origin!, wallets: addresses, logo, permissions });
  };
  return (
    <Body>
      <Center>
        <DAppBadge logo={logo} origin={origin} />
        <H1>Connect With OpenMask</H1>
        <Text>Address: {addresses.map(toShortAddress).join(", ")}</Text>
        <Text>Allow this site to:</Text>
      </Center>
      {PermissionList.map((item) => {
        return (
          <PermissionView
            key={item}
            permission={item}
            disabled={item === Permission.base}
            selected={permissions.includes(item)}
            onSelect={(value) => {
              if (value) {
                setPermissions((permissions) => permissions.concat([item]));
              } else {
                setPermissions((permissions) =>
                  permissions.filter((permission) => permission !== item)
                );
              }
            }}
          />
        );
      })}
      <Gap />
      <ButtonBottomRow>
        <ButtonNegative onClick={onBack} disabled={isLoading}>
          Back
        </ButtonNegative>
        <ButtonPositive onClick={onConnect} disabled={isLoading}>
          Connect
        </ButtonPositive>
      </ButtonBottomRow>
    </Body>
  );
};