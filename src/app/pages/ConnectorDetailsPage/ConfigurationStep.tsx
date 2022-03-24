import { JsonSchemaConfigurator } from '@app/components/JsonSchemaConfigurator/JsonSchemaConfigurator';
import _ from 'lodash';
import React from 'react';
import { FC } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Form,
  FormGroup,
  Popover,
  Text,
  TextVariants,
  Title,
  TitleSizes,
} from '@patternfly/react-core';
import { HelpIcon } from '@patternfly/react-icons';

export type ConfigurationType = {
  [key: string]: any;
};
export type ConfigurationStepProps = {
  editMode: boolean;
  schema: Record<string, any>;
  configuration: unknown;
  changeIsValid: (isValid: boolean) => void;
  onUpdateConfiguration: (type: string, update: any) => void;
};
export const ConfigurationStep: FC<ConfigurationStepProps> = ({
  editMode,
  schema,
  configuration,
  changeIsValid,
  onUpdateConfiguration,
}) => {
  const { t } = useTranslation();

  const formConfiguration = JSON.parse(JSON.stringify(configuration));
  Object.keys(formConfiguration as object).map((key) => {
    if (_.isEmpty((formConfiguration as { [key: string]: any })[key])) {
      (formConfiguration as { [key: string]: any })[key] = '';
    }
  });

  const onChange = (config: unknown, isValid: boolean) => {
    onUpdateConfiguration('connector', config);
    changeIsValid(isValid);
  };

  return (
    <>
      <Title
        headingLevel="h3"
        size={TitleSizes['2xl']}
        className={'pf-u-pr-md pf-u-pb-md'}
      >
        {t('Connector specific')}
      </Title>
      {editMode ? (
        <JsonSchemaConfigurator
          schema={schema}
          configuration={formConfiguration || {}}
          onChange={onChange}
          editCase={true}
        />
      ) : (
        <Form>
          {Object.entries(schema.properties)
            .filter(([key, value]: [string, any]) => {
              if (['object', 'array'].includes(value.type)) {
                if (key === 'data_shape') {
                  return true;
                }
                return false;
              }
              return true;
            })
            .map(([key, value]: [string, any]) => (
              <FormGroup
                key={key}
                label={value.title || _.capitalize(key.replace('_', ' '))}
                fieldId={key}
                isRequired={schema.required.includes(key)}
                labelIcon={
                  <Popover
                    bodyContent={
                      <p>
                        {value.description
                          ? value.description
                          : _.capitalize(key.replace('_', ' '))}
                      </p>
                    }
                  >
                    <button
                      type="button"
                      aria-label="More info for name field"
                      onClick={(e) => e.preventDefault()}
                      aria-describedby="simple-form-name-01"
                      className="pf-c-form__group-label-help"
                    >
                      <HelpIcon noVerticalAlign />
                    </button>
                  </Popover>
                }
              >
                {key === 'data_shape' ? (
                  <DataShape
                    data={(formConfiguration as ConfigurationType)[key]}
                  />
                ) : (
                  <Text component={TextVariants.p}>
                    {_.isObject((formConfiguration as ConfigurationType)[key])
                      ? JSON.stringify(
                          (formConfiguration as ConfigurationType)[key]
                        )
                      : (formConfiguration as ConfigurationType)[key]}
                  </Text>
                )}
              </FormGroup>
            ))}
        </Form>
      )}
    </>
  );
};
type DataShape = {
  data: any;
};
export const DataShape: FC<DataShape> = ({ data }) => {
  return (
    <>
      {Object.keys(data).map((key) => {
        return (
          <FormGroup key={key} label={_.upperFirst(key)} fieldId={key}>
            <Text component={TextVariants.p}>{data[key].format}</Text>
          </FormGroup>
        );
      })}
    </>
  );
};